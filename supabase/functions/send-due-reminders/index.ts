// Edge Function: send-due-reminders
// Executada periodicamente (pg_cron). Procura compromissos próximos e envia Web Push.
// Regra: 1 dia antes (janela de 24h-26h antes) e no dia (janela 0h-2h antes ou até momento).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = "BPrmlXuvI39iAjZrqAOGqE29jvusKSvVBlxLyFI7_D-W0C7Ui0m5OJAhs8OEWWgMxMf-_EpwQGDOkH-LJJwoKSk";
const VAPID_PRIVATE = (Deno.env.get("VAPID_PRIVATE_KEY") || "")
  .trim()
  .replace(/^["'<]+|["'>]+$/g, "")
  .replace(/=+$/g, "")
  .replace(/[^A-Za-z0-9_-]/g, "");

// Sanea o VAPID_SUBJECT: precisa ser uma URI válida "mailto:email@dominio" ou https://...
function saneiaSubject(raw: string): string {
  let s = (raw || "").trim().replace(/[<>]/g, "").replace(/\s+/g, "");
  if (!s) return "mailto:contato@appmiva.com.br";
  if (s.startsWith("mailto:") || s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.includes("@")) return "mailto:" + s;
  return "mailto:contato@appmiva.com.br";
}
const VAPID_SUBJECT = saneiaSubject(Deno.env.get("VAPID_SUBJECT") || "");

console.log("[vapid] private_key_len:", VAPID_PRIVATE.length, "subject:", VAPID_SUBJECT);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

interface Sub {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function enviarParaUsuaria(userId: string, payload: object) {
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (!subs?.length) return 0;

  let enviados = 0;
  for (const s of subs as Sub[]) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      );
      enviados++;
    } catch (err: any) {
      const status = err?.statusCode;
      // Inscrição morta: remove
      if (status === 404 || status === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", s.id);
      } else {
        console.error("push error", status, err?.body);
      }
    }
  }
  return enviados;
}

const CRON_SECRET = (Deno.env.get("CRON_SECRET") || "").trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // Só o agendador interno (pg_cron) pode disparar esta função.
  const provided = (req.headers.get("x-cron-secret") || "").trim();
  if (!CRON_SECRET || provided !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {

    // Modo TESTE: { test_compromisso_id: "uuid" } envia um lembrete imediato pra esse compromisso,
    // independente da janela e sem marcar como notificado.
    let body: any = {};
    try { body = await req.json(); } catch { /* sem body */ }

    if (body?.test_compromisso_id) {
      const { data: c } = await supabase
        .from("compromissos")
        .select("id, user_id, titulo, data_hora, local")
        .eq("id", body.test_compromisso_id)
        .maybeSingle();
      if (!c) {
        return new Response(JSON.stringify({ error: "compromisso não encontrado" }), {
          status: 404, headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const dh = new Date(c.data_hora);
      const data = dh.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", timeZone: "America/Sao_Paulo" });
      const hh = dh.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
      const enviados = await enviarParaUsuaria(c.user_id, {
        title: "Teste de lembrete 💕",
        body: `${data} às ${hh}: ${c.titulo}${c.local ? " · " + c.local : ""}`,
        tag: `miva-teste-${c.id}`,
        url: "/agenda",
      });
      return new Response(JSON.stringify({ ok: true, modo: "teste", enviados }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const agora = new Date();
    const em26h = new Date(agora.getTime() + 26 * 60 * 60 * 1000);
    const em2h = new Date(agora.getTime() + 2 * 60 * 60 * 1000);

    // 1) Notificar 1 DIA ANTES: compromissos entre agora+22h e agora+26h, ainda não notificados
    const inicioDiaAntes = new Date(agora.getTime() + 22 * 60 * 60 * 1000);
    const { data: diaAntes } = await supabase
      .from("compromissos")
      .select("id, user_id, titulo, data_hora, local")
      .eq("notificado_dia_anterior", false)
      .eq("concluido", false)
      .gte("data_hora", inicioDiaAntes.toISOString())
      .lte("data_hora", em26h.toISOString());

    let totalDiaAntes = 0;
    for (const c of diaAntes ?? []) {
      const dh = new Date(c.data_hora);
      const hh = dh.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
      await enviarParaUsuaria(c.user_id, {
        title: "Lembrete carinhoso 💕",
        body: `Amanhã às ${hh}: ${c.titulo}${c.local ? " · " + c.local : ""}`,
        tag: `miva-d1-${c.id}`,
        url: "/agenda",
      });
      await supabase.from("compromissos").update({ notificado_dia_anterior: true }).eq("id", c.id);
      totalDiaAntes++;
    }

    // 2) Notificar NO DIA: compromissos entre agora e agora+2h, ainda não notificados
    const { data: noDia } = await supabase
      .from("compromissos")
      .select("id, user_id, titulo, data_hora, local")
      .eq("notificado_no_dia", false)
      .eq("concluido", false)
      .gte("data_hora", agora.toISOString())
      .lte("data_hora", em2h.toISOString());

    let totalNoDia = 0;
    for (const c of noDia ?? []) {
      const dh = new Date(c.data_hora);
      const hh = dh.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
      await enviarParaUsuaria(c.user_id, {
        title: "Está chegando ✨",
        body: `Hoje às ${hh}: ${c.titulo}${c.local ? " · " + c.local : ""}`,
        tag: `miva-d0-${c.id}`,
        url: "/agenda",
      });
      await supabase.from("compromissos").update({ notificado_no_dia: true }).eq("id", c.id);
      totalNoDia++;
    }

    // 3) Avisos de vencimento do plano/trial: 3 dias antes, 1 dia antes e no dia em que vence
    const hojeStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    const emDias = (n: number) => {
      const d = new Date(hojeStr + "T12:00:00");
      d.setDate(d.getDate() + n);
      return d.toISOString().slice(0, 10);
    };

    const { data: assinaturas } = await supabase
      .from("assinaturas")
      .select("user_id, status, trial_fim, periodo_fim, aviso_venc_3d, aviso_venc_1d, aviso_vencida, recorrencia_ativa")
      .in("status", ["trial", "ativa"]);

    let totalPlano = 0;
    for (const a of assinaturas ?? []) {
      const fim = a.status === "trial" ? a.trial_fim : a.periodo_fim;
      if (!fim) continue;

      const ehTrial = a.status === "trial";
      let campo: "aviso_venc_3d" | "aviso_venc_1d" | "aviso_vencida" | null = null;
      let title = "";
      let body = "";

      if (fim === emDias(3) && a.aviso_venc_3d !== hojeStr) {
        campo = "aviso_venc_3d";
        title = ehTrial ? "Seu teste termina em 3 dias 💕" : "Sua mensalidade vence em 3 dias";
        body = a.recorrencia_ativa
          ? "Fica tranquila: a renovação é automática, não precisa fazer nada ✨"
          : "Renove quando puder para continuar com tudo organizado por aqui.";
      } else if (fim === emDias(1) && a.aviso_venc_1d !== hojeStr) {
        campo = "aviso_venc_1d";
        title = ehTrial ? "Último dia de teste ✨" : "Sua mensalidade vence amanhã";
        body = a.recorrencia_ativa
          ? "A cobrança automática acontece amanhã, sem você precisar fazer nada."
          : "Toque aqui para renovar em poucos segundos, com Pix ou cartão.";
      } else if (fim < hojeStr && a.aviso_vencida !== hojeStr) {
        campo = "aviso_vencida";
        title = ehTrial ? "Seu teste terminou 🌷" : "Seu acesso está pausado 🌷";
        body = "Seus dados estão guardadinhos aqui. Renove quando quiser para voltar.";
      }

      if (!campo) continue;

      await enviarParaUsuaria(a.user_id, {
        title,
        body,
        tag: `miva-plano-${campo}`,
        url: "/plano",
      });
      await supabase
        .from("assinaturas")
        .update({ [campo]: hojeStr })
        .eq("user_id", a.user_id);
      totalPlano++;
    }

    return new Response(
      JSON.stringify({ ok: true, dia_anterior: totalDiaAntes, no_dia: totalNoDia, avisos_plano: totalPlano }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("send-due-reminders error", e);
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

// Helpers compartilhados de ativação de assinatura (usados por webhook, sync e recorrência).
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

export const VALOR_PLANO = 39.90;

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const dia = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Ativa (ou renova) a assinatura por 30 dias a partir de hoje — ou a partir do
 * fim do período atual, se ainda estiver vigente (não perde dias já pagos).
 */
export async function ativarAssinatura(
  admin: SupabaseClient,
  opts: {
    userId: string;
    pagamentoId: string;
    metodo: "pix" | "cartao" | "credito_indicacao";
    valor: number;
  },
) {
  const hoje = new Date();

  const { data: assin } = await admin
    .from("assinaturas")
    .select("periodo_fim, status")
    .eq("user_id", opts.userId)
    .maybeSingle();

  let inicio = hoje;
  if (assin?.status === "ativa" && assin.periodo_fim) {
    const fimAtual = new Date(assin.periodo_fim + "T12:00:00");
    if (fimAtual > hoje) inicio = fimAtual;
  }
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 30);

  await admin
    .from("assinaturas")
    .update({
      status: "ativa",
      metodo: opts.metodo,
      periodo_inicio: dia(hoje),
      periodo_fim: dia(fim),
      ultimo_pagamento_id: opts.pagamentoId,
      aviso_venc_3d: null,
      aviso_venc_1d: null,
      aviso_vencida: null,
    })
    .eq("user_id", opts.userId);

  await admin
    .from("pagamentos")
    .update({ cobranca_de: dia(hoje), cobranca_ate: dia(fim) })
    .eq("id", opts.pagamentoId);

  // Registra no extrato da usuária (idempotente)
  const label =
    opts.metodo === "pix" ? "Pix"
      : opts.metodo === "cartao" ? "Cartão"
        : "Saldo de indicação";
  const descricao = `Sistema Miva — mensalidade (${label})`;
  const dataStr = dia(hoje);

  const { data: jaExiste } = await admin
    .from("contas")
    .select("id")
    .eq("user_id", opts.userId)
    .eq("descricao", descricao)
    .eq("data_pagamento", dataStr)
    .maybeSingle();

  if (!jaExiste) {
    await admin.from("contas").insert({
      user_id: opts.userId,
      descricao,
      categoria: "Sistema Miva",
      valor: opts.valor,
      data_vencimento: dataStr,
      data_pagamento: dataStr,
      pago: true,
      recorrente: false,
    });
  }

  await admin.rpc("aplicar_credito_indicacao", { _pagamento_id: opts.pagamentoId });

  return { periodo_fim: dia(fim) };
}

/** Autentica o chamador e devolve user id + email. */
export async function autenticar(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await userClient.auth.getClaims(token);
  if (error || !data?.claims) return null;
  return {
    userId: data.claims.sub as string,
    email: (data.claims.email as string) ?? "cliente@miva.app",
  };
}

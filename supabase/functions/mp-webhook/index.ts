// Webhook do Mercado Pago: confirma pagamentos avulsos (Pix/cartão) e cobranças
// automáticas da assinatura recorrente (preapproval), ativando o acesso.
// Endpoint público — valida via consulta autenticada ao MP usando o ID recebido.
import { adminClient, ativarAssinatura, corsHeaders } from "../_shared/assinatura.ts";

const MP_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;

const mpGet = async (path: string) => {
  const res = await fetch(`https://api.mercadopago.com${path}`, {
    headers: { Authorization: `Bearer ${MP_TOKEN}` },
  });
  if (!res.ok) {
    console.error("MP fetch error", path, await res.text());
    return null;
  }
  return await res.json();
};

const ok = (msg: string) => new Response(msg, { status: 200, headers: corsHeaders });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let mpId: string | null = url.searchParams.get("data.id") || url.searchParams.get("id");
    let topic = url.searchParams.get("type") || url.searchParams.get("topic");

    if (!mpId || !topic) {
      const body = await req.json().catch(() => null);
      mpId = mpId ?? body?.data?.id ?? body?.id ?? null;
      topic = topic ?? body?.type ?? body?.topic ?? null;
    }
    if (!mpId || !topic) return ok("ignored");

    const admin = adminClient();
    const t = String(topic);

    // ---------- 1) Cobrança automática da assinatura recorrente ----------
    if (t.includes("authorized_payment")) {
      const ap = await mpGet(`/authorized_payments/${mpId}`);
      if (!ap) return ok("mp_error");

      const preapprovalId = String(ap.preapproval_id ?? "");
      const paymentStatus = ap.payment?.status ?? ap.status;
      if (!preapprovalId) return ok("no_preapproval");

      const { data: assinatura } = await admin
        .from("assinaturas")
        .select("id, user_id")
        .eq("mp_preapproval_id", preapprovalId)
        .maybeSingle();
      if (!assinatura) return ok("assinatura_not_found");

      const mpPaymentId = String(ap.payment?.id ?? mpId);
      const valor = Number(ap.transaction_amount ?? 39.90);

      const { data: existente } = await admin
        .from("pagamentos")
        .select("id, status")
        .eq("mp_payment_id", mpPaymentId)
        .maybeSingle();

      const aprovado = paymentStatus === "approved" || paymentStatus === "processed";
      const statusLocal = aprovado ? "aprovado" : paymentStatus === "rejected" ? "rejeitado" : "pendente";

      let pagamentoId = existente?.id;
      if (existente) {
        await admin.from("pagamentos").update({
          status: statusLocal,
          mp_status: String(paymentStatus),
          pago_em: aprovado ? new Date().toISOString() : null,
        }).eq("id", existente.id);
      } else {
        const { data: novo } = await admin.from("pagamentos").insert({
          user_id: assinatura.user_id,
          assinatura_id: assinatura.id,
          metodo: "cartao",
          valor,
          status: statusLocal,
          mp_payment_id: mpPaymentId,
          mp_status: String(paymentStatus),
          pago_em: aprovado ? new Date().toISOString() : null,
        }).select("id").single();
        pagamentoId = novo?.id;
      }

      if (aprovado && pagamentoId && existente?.status !== "aprovado") {
        await ativarAssinatura(admin, {
          userId: assinatura.user_id,
          pagamentoId,
          metodo: "cartao",
          valor,
        });
      }
      return ok("ok");
    }

    // ---------- 2) Mudança de status da recorrência ----------
    if (t.includes("preapproval")) {
      const pre = await mpGet(`/preapproval/${mpId}`);
      if (!pre) return ok("mp_error");
      const ativa = pre.status === "authorized";
      await admin
        .from("assinaturas")
        .update({ recorrencia_ativa: ativa })
        .eq("mp_preapproval_id", String(pre.id));
      return ok("ok");
    }

    // ---------- 3) Pagamento avulso (Pix / cartão) ----------
    if (!t.includes("payment")) return ok("ignored");

    const pay = await mpGet(`/v1/payments/${mpId}`);
    if (!pay) return ok("mp_error");

    const { data: nosso } = await admin
      .from("pagamentos")
      .select("id, user_id, assinatura_id, status")
      .eq("mp_payment_id", String(pay.id))
      .maybeSingle();

    if (!nosso) {
      console.log("Pagamento não encontrado localmente:", pay.id);
      return ok("not_found");
    }

    const novoStatus =
      pay.status === "approved" ? "aprovado"
        : pay.status === "rejected" ? "rejeitado"
          : pay.status === "cancelled" ? "cancelado"
            : "pendente";

    await admin
      .from("pagamentos")
      .update({
        status: novoStatus,
        mp_status: pay.status,
        pago_em: pay.status === "approved" ? new Date().toISOString() : null,
      })
      .eq("id", nosso.id);

    if (pay.status === "approved" && nosso.status !== "aprovado") {
      const metodo = pay.payment_type_id === "credit_card" || pay.payment_type_id === "debit_card"
        ? "cartao"
        : "pix";
      await ativarAssinatura(admin, {
        userId: nosso.user_id,
        pagamentoId: nosso.id,
        metodo,
        valor: Number(pay.transaction_amount ?? 39.90),
      });
    }

    return ok("ok");
  } catch (e) {
    console.error("Webhook error", e);
    // Sempre 200 pra MP não ficar tentando infinitamente
    return ok("err");
  }
});

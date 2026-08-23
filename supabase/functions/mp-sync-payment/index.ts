// Consulta o status real de um pagamento no Mercado Pago (fallback caso o webhook atrase).
// Usado pela tela do Pix para confirmar o pagamento em tempo real.
import { adminClient, ativarAssinatura, autenticar, corsHeaders, jsonResponse } from "../_shared/assinatura.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await autenticar(req);
    if (!auth) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    const pagamentoId = body?.pagamento_id;
    if (!pagamentoId || typeof pagamentoId !== "string") {
      return jsonResponse({ error: "pagamento_id é obrigatório" }, 400);
    }

    const MP_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!MP_TOKEN) return jsonResponse({ error: "Mercado Pago não configurado" }, 500);

    const admin = adminClient();
    const { data: pag } = await admin
      .from("pagamentos")
      .select("id, user_id, status, valor, metodo, mp_payment_id")
      .eq("id", pagamentoId)
      .maybeSingle();

    if (!pag || pag.user_id !== auth.userId) {
      return jsonResponse({ error: "Pagamento não encontrado" }, 404);
    }
    if (pag.status === "aprovado") return jsonResponse({ status: "aprovado" });
    if (!pag.mp_payment_id) return jsonResponse({ status: pag.status });

    const mpRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${pag.mp_payment_id}`,
      { headers: { Authorization: `Bearer ${MP_TOKEN}` } },
    );
    if (!mpRes.ok) {
      console.error("MP fetch error", await mpRes.text());
      return jsonResponse({ status: pag.status });
    }
    const pay = await mpRes.json();

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
      .eq("id", pag.id);

    if (pay.status === "approved") {
      await ativarAssinatura(admin, {
        userId: pag.user_id,
        pagamentoId: pag.id,
        metodo: pag.metodo === "cartao" ? "cartao" : "pix",
        valor: Number(pay.transaction_amount ?? pag.valor),
      });
    }

    return jsonResponse({ status: novoStatus, mp_status: pay.status });
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Erro interno" }, 500);
  }
});

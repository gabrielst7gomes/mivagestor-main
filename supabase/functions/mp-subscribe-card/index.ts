// Cria uma assinatura recorrente (preapproval) no Mercado Pago com o cartão tokenizado.
// A cobrança de R$ 39,90 passa a ser automática todo mês, sem a usuária precisar refazer o Pix.
import { adminClient, autenticar, corsHeaders, jsonResponse, VALOR_PLANO } from "../_shared/assinatura.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await autenticar(req);
    if (!auth) return jsonResponse({ error: "Unauthorized" }, 401);

    const MP_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!MP_TOKEN) return jsonResponse({ error: "Mercado Pago não configurado" }, 500);

    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    const cardToken = body?.card_token_id;
    if (!cardToken || typeof cardToken !== "string") {
      return jsonResponse({ error: "card_token_id é obrigatório" }, 400);
    }
    const payerEmail = typeof body?.payer_email === "string" && body.payer_email
      ? body.payer_email
      : auth.email;

    const admin = adminClient();
    const { data: assinatura } = await admin
      .from("assinaturas")
      .select("id, status, periodo_fim, trial_fim, mp_preapproval_id, recorrencia_ativa")
      .eq("user_id", auth.userId)
      .maybeSingle();

    if (!assinatura) return jsonResponse({ error: "Assinatura não encontrada" }, 404);
    if (assinatura.recorrencia_ativa && assinatura.mp_preapproval_id) {
      return jsonResponse({ ja_ativa: true, preapproval_id: assinatura.mp_preapproval_id });
    }

    // Primeira cobrança automática: só depois do período já pago/trial.
    const hoje = new Date();
    const refFim = assinatura.status === "trial" ? assinatura.trial_fim : assinatura.periodo_fim;
    let inicio = new Date(hoje.getTime() + 60_000);
    if (refFim) {
      const fim = new Date(refFim + "T12:00:00");
      if (fim > inicio) inicio = fim;
    }

    const mpRes = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MP_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        reason: "Miva — Assinatura mensal",
        external_reference: auth.userId,
        payer_email: payerEmail,
        card_token_id: cardToken,
        status: "authorized",
        back_url: "https://appmiva.com.br/plano",
        notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mp-webhook`,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: VALOR_PLANO,
          currency_id: "BRL",
          start_date: inicio.toISOString(),
        },
      }),
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      console.error("MP preapproval error:", mpData);
      return jsonResponse(
        { error: "Não consegui ativar a renovação automática", detalhes: mpData?.message ?? mpData },
        402,
      );
    }

    await admin
      .from("assinaturas")
      .update({
        mp_preapproval_id: String(mpData.id),
        recorrencia_ativa: mpData.status === "authorized",
        metodo: "cartao",
      })
      .eq("user_id", auth.userId);

    return jsonResponse({
      ok: true,
      preapproval_id: mpData.id,
      status: mpData.status,
      proxima_cobranca: inicio.toISOString(),
    });
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Erro interno" }, 500);
  }
});

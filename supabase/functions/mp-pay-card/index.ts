// Processa pagamento com cartão usando token gerado no front (MercadoPago.js).
// Mantém o checkout 100% interno: o front tokeniza, o back só envia o token.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VALOR = 39.90;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const MP_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!MP_TOKEN) return json({ error: "MERCADOPAGO_ACCESS_TOKEN não configurado" }, 500);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;
    const userEmail = (claims.claims.email as string) ?? "cliente@miva.app";

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: "Body inválido" }, 400);

    const {
      token: cardToken,
      payment_method_id,
      issuer_id,
      installments,
      identificationType,
      identificationNumber,
      payer_email,
    } = body as Record<string, unknown>;

    if (!cardToken || !payment_method_id) {
      return json({ error: "token e payment_method_id são obrigatórios" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);
    const { data: assinatura } = await admin
      .from("assinaturas")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!assinatura) return json({ error: "Assinatura não encontrada" }, 404);

    // Abate saldo de indicação
    const { data: saldoData } = await admin.rpc("saldo_indicacao", { _user_id: userId });
    const saldo = Math.max(0, Number(saldoData ?? 0));
    const abater = Math.min(saldo, VALOR);
    const valorCobrado = Math.max(0.5, +(VALOR - abater).toFixed(2));
    // se ficar abaixo de 0.5 (mínimo do MP), ainda cobramos 0.5 simbólico para não perder o rastro do cartão
    // (na prática, cartão exige cobrança real; quem quiser pagar tudo com saldo deve usar PIX)

    const idempotencyKey = crypto.randomUUID();

    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MP_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: valorCobrado,
        token: cardToken,
        description: "Miva — Assinatura mensal",
        installments: Number(installments) || 1,
        payment_method_id,
        issuer_id,
        external_reference: userId,
        notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
        payer: {
          email: (payer_email as string) || userEmail,
          identification:
            identificationType && identificationNumber
              ? { type: identificationType, number: identificationNumber }
              : undefined,
        },
      }),
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      console.error("MP card error:", mpData);
      return json(
        { error: "Pagamento recusado", detalhes: mpData?.message ?? mpData },
        402
      );
    }

    const aprovado = mpData.status === "approved";

    const { data: pagamento, error: insErr } = await admin
      .from("pagamentos")
      .insert({
        user_id: userId,
        assinatura_id: assinatura.id,
        metodo: "cartao",
        valor: valorCobrado,
        status: aprovado
          ? "aprovado"
          : mpData.status === "rejected"
            ? "rejeitado"
            : "pendente",
        mp_payment_id: String(mpData.id),
        mp_status: mpData.status,
        pago_em: aprovado ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (insErr) console.error("DB insert error:", insErr);

    // Aplica abatimento de saldo de indicação no extrato
    if (abater > 0 && pagamento) {
      await admin.rpc("aplicar_saldo_em_pagamento", {
        _pagamento_id: pagamento.id,
        _valor_solicitado: abater,
      });
    }

    // Se aprovado, ativa imediatamente (sem esperar webhook)
    if (aprovado && pagamento) {
      const hoje = new Date();
      const fim = new Date(hoje);
      fim.setDate(fim.getDate() + 30);
      await admin
        .from("assinaturas")
        .update({
          status: "ativa",
          metodo: "cartao",
          periodo_inicio: hoje.toISOString().slice(0, 10),
          periodo_fim: fim.toISOString().slice(0, 10),
          ultimo_pagamento_id: pagamento.id,
        })
        .eq("user_id", userId);

      await admin
        .from("pagamentos")
        .update({
          cobranca_de: hoje.toISOString().slice(0, 10),
          cobranca_ate: fim.toISOString().slice(0, 10),
        })
        .eq("id", pagamento.id);

      // Registra "Sistema Miva" como conta paga no extrato da usuária
      const valor = Number(mpData.transaction_amount ?? 39.90);
      const dataStr = hoje.toISOString().slice(0, 10);
      const descricao = "Sistema Miva — mensalidade (Cartão)";

      const { data: jaExiste } = await admin
        .from("contas")
        .select("id")
        .eq("user_id", userId)
        .eq("descricao", descricao)
        .eq("data_pagamento", dataStr)
        .maybeSingle();

      if (!jaExiste) {
        await admin.from("contas").insert({
          user_id: userId,
          descricao,
          categoria: "Sistema Miva",
          valor,
          data_vencimento: dataStr,
          data_pagamento: dataStr,
          pago: true,
          recorrente: false,
        });
      }

      // Credita indicação (se a usuária foi indicada por alguém)
      await admin.rpc("aplicar_credito_indicacao", { _pagamento_id: pagamento.id });
    }

    return json({
      status: mpData.status,
      status_detail: mpData.status_detail,
      aprovado,
      mp_payment_id: mpData.id,
    });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Erro interno" }, 500);
  }

  function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

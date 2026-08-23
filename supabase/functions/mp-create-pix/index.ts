// Cria uma cobrança Pix no Mercado Pago e devolve QR Code para exibir no app.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VALOR = 39.90;
const MINUTOS_VALIDADE = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const MP_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!MP_TOKEN) return json({ error: "MERCADOPAGO_ACCESS_TOKEN não configurado" }, 500);

    // Auth do user
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;
    const email = (claims.claims.email as string) ?? "cliente@miva.app";

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);

    const { data: assinatura } = await admin
      .from("assinaturas")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!assinatura) return json({ error: "Assinatura não encontrada" }, 404);

    // Calcula saldo de indicação e abate da fatura (até zerar)
    const { data: saldoData } = await admin.rpc("saldo_indicacao", { _user_id: userId });
    const saldo = Math.max(0, Number(saldoData ?? 0));
    const abater = Math.min(saldo, VALOR);
    let valorCobrado = Math.max(0, +(VALOR - abater).toFixed(2));

    // Mercado Pago não aceita cobrança abaixo de R$ 0,50; se ficar abaixo, libera direto sem cobrança
    const valorMinimoMP = 0.5;

    // Idempotency key único por requisição
    const idempotencyKey = crypto.randomUUID();

    const expiresAt = new Date(Date.now() + MINUTOS_VALIDADE * 60_000);

    // CASO 1: saldo cobre 100% (ou quase) — não cria cobrança no MP, ativa direto
    if (valorCobrado < valorMinimoMP) {
      valorCobrado = 0;
      const hoje = new Date();
      const fim = new Date(hoje); fim.setDate(fim.getDate() + 30);

      const { data: pagamento } = await admin.from("pagamentos").insert({
        user_id: userId,
        assinatura_id: assinatura.id,
        metodo: "credito_indicacao",
        valor: VALOR,
        status: "aprovado",
        mp_payment_id: null,
        mp_status: "approved_by_credit",
        pago_em: hoje.toISOString(),
        cobranca_de: hoje.toISOString().slice(0, 10),
        cobranca_ate: fim.toISOString().slice(0, 10),
      }).select().single();

      if (pagamento) {
        await admin.rpc("aplicar_saldo_em_pagamento", { _pagamento_id: pagamento.id, _valor_solicitado: abater });
        await admin.from("assinaturas").update({
          status: "ativa",
          metodo: "credito_indicacao",
          periodo_inicio: hoje.toISOString().slice(0, 10),
          periodo_fim: fim.toISOString().slice(0, 10),
          ultimo_pagamento_id: pagamento.id,
        }).eq("user_id", userId);

        await admin.from("contas").insert({
          user_id: userId,
          descricao: "Sistema Miva — mensalidade (Saldo de indicação)",
          categoria: "Sistema Miva",
          valor: VALOR,
          data_vencimento: hoje.toISOString().slice(0, 10),
          data_pagamento: hoje.toISOString().slice(0, 10),
          pago: true,
          recorrente: false,
        });
      }

      return json({
        pago_com_saldo: true,
        valor_abatido: abater,
        valor_cobrado: 0,
      });
    }

    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MP_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: valorCobrado,
        description: "Miva — Assinatura mensal",
        payment_method_id: "pix",
        date_of_expiration: expiresAt.toISOString(),
        payer: { email },
        external_reference: userId,
        notification_url: `${SUPABASE_URL}/functions/v1/mp-webhook`,
      }),
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      console.error("MP Pix error:", mpData);
      return json({ error: "Erro ao criar Pix", detalhes: mpData }, 502);
    }

    const qrCode = mpData.point_of_interaction?.transaction_data?.qr_code;
    const qrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64;

    const { data: pagamento, error: insErr } = await admin
      .from("pagamentos")
      .insert({
        user_id: userId,
        assinatura_id: assinatura.id,
        metodo: "pix",
        valor: valorCobrado,
        status: "pendente",
        mp_payment_id: String(mpData.id),
        mp_status: mpData.status,
        pix_qr_code: qrCode,
        pix_qr_code_base64: qrCodeBase64,
        pix_expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (insErr) {
      console.error("DB insert error:", insErr);
      return json({ error: "Erro ao registrar pagamento" }, 500);
    }

    // Marca o abatimento (registra no extrato de créditos)
    if (abater > 0 && pagamento) {
      await admin.rpc("aplicar_saldo_em_pagamento", {
        _pagamento_id: pagamento.id,
        _valor_solicitado: abater,
      });
    }

    return json({
      pagamento_id: pagamento.id,
      mp_payment_id: mpData.id,
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64,
      expires_at: expiresAt.toISOString(),
      valor: valorCobrado,
      valor_total: VALOR,
      valor_abatido: abater,
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

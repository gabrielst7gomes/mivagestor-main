// Cancela a renovação automática (preapproval) no Mercado Pago.
// O acesso continua válido até o fim do período já pago.
import { adminClient, autenticar, corsHeaders, jsonResponse } from "../_shared/assinatura.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await autenticar(req);
    if (!auth) return jsonResponse({ error: "Unauthorized" }, 401);

    const MP_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!MP_TOKEN) return jsonResponse({ error: "Mercado Pago não configurado" }, 500);

    const admin = adminClient();
    const { data: assinatura } = await admin
      .from("assinaturas")
      .select("mp_preapproval_id")
      .eq("user_id", auth.userId)
      .maybeSingle();

    if (assinatura?.mp_preapproval_id) {
      const res = await fetch(
        `https://api.mercadopago.com/preapproval/${assinatura.mp_preapproval_id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${MP_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "cancelled" }),
        },
      );
      if (!res.ok) {
        console.error("MP cancel error:", await res.text());
      }
    }

    await admin
      .from("assinaturas")
      .update({ recorrencia_ativa: false, mp_preapproval_id: null })
      .eq("user_id", auth.userId);

    return jsonResponse({ ok: true });
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Erro interno" }, 500);
  }
});

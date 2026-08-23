// Devolve a public key do Mercado Pago para o front (segura — feita para ser pública).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const key = Deno.env.get("MERCADOPAGO_PUBLIC_KEY") ?? null;
  return new Response(JSON.stringify({ public_key: key }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

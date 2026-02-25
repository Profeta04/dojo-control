import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { payment_id, dojo_id } = await req.json();

    if (!payment_id || !dojo_id) {
      return new Response(
        JSON.stringify({ error: "payment_id and dojo_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get dojo integration credentials (per-dojo enablement)
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: integration } = await adminClient
      .from("dojo_integrations")
      .select("access_token, is_enabled")
      .eq("dojo_id", dojo_id)
      .eq("integration_type", "mercadopago")
      .single();

    if (!integration || !integration.is_enabled || !integration.access_token) {
      return new Response(
        JSON.stringify({ error: "Dojo não possui integração Mercado Pago habilitada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get payment details
    const { data: payment, error: paymentError } = await adminClient
      .from("payments")
      .select("amount, description, student_id, due_date")
      .eq("id", payment_id)
      .single();

    if (paymentError || !payment) {
      return new Response(
        JSON.stringify({ error: "Pagamento não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get student info for payer
    const { data: student } = await adminClient
      .from("profiles")
      .select("name, email")
      .eq("user_id", payment.student_id)
      .single();

    // Create PIX payment via Mercado Pago API
    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${integration.access_token}`,
        "X-Idempotency-Key": payment_id,
      },
      body: JSON.stringify({
        transaction_amount: Number(payment.amount),
        description: payment.description || "Mensalidade",
        payment_method_id: "pix",
        payer: {
          email: student?.email || "aluno@dojo.com",
          first_name: student?.name?.split(" ")[0] || "Aluno",
          last_name: student?.name?.split(" ").slice(1).join(" ") || "",
        },
        date_of_expiration: new Date(
          new Date(payment.due_date).getTime() + 3 * 24 * 60 * 60 * 1000
        ).toISOString(),
      }),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("Mercado Pago error:", mpData);
      return new Response(
        JSON.stringify({
          error: "Erro ao gerar PIX no Mercado Pago",
          details: mpData.message || mpData.cause?.[0]?.description || "Erro desconhecido",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pixData = mpData.point_of_interaction?.transaction_data;

    return new Response(
      JSON.stringify({
        qr_code: pixData?.qr_code || null,
        qr_code_base64: pixData?.qr_code_base64 || null,
        ticket_url: pixData?.ticket_url || null,
        mp_payment_id: mpData.id,
        status: mpData.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating PIX payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

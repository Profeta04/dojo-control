import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");

    const user = userData.user;
    const { payment_id } = await req.json();
    if (!payment_id) throw new Error("payment_id is required");

    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("id", payment_id)
      .eq("student_id", user.id)
      .single();

    if (paymentError || !payment) throw new Error("Payment not found");
    if (payment.status === "pago") throw new Error("Payment already paid");

    // Get student profile to find dojo
    const { data: profile } = await supabase
      .from("profiles")
      .select("dojo_id, name")
      .eq("user_id", user.id)
      .single();

    if (!profile?.dojo_id) throw new Error("Student has no dojo");

    // Get Stripe Connect account for this dojo
    const { data: integration } = await supabase
      .from("dojo_integrations")
      .select("access_token, is_enabled")
      .eq("dojo_id", profile.dojo_id)
      .eq("integration_type", "stripe_connect")
      .eq("is_enabled", true)
      .maybeSingle();

    if (!integration?.access_token) {
      throw new Error("Dojo has no active Stripe Connect account");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Amount in centavos (Stripe uses smallest currency unit)
    const amountInCents = Math.round(payment.amount * 100);

    const origin = req.headers.get("origin") || "https://dojo-control.lovable.app";

    // Create Checkout Session with payment going to connected account
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "pix"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: payment.description || "Mensalidade",
              description: `Pagamento - ${profile.name}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: 0, // Platform fee (0 for now, can be configured)
        transfer_data: {
          destination: integration.access_token,
        },
      },
      customer_email: user.email || undefined,
      metadata: {
        payment_id: payment.id,
        student_id: user.id,
        dojo_id: profile.dojo_id,
      },
      success_url: `${origin}/student/payments?stripe=success&payment_id=${payment.id}`,
      cancel_url: `${origin}/student/payments?stripe=cancel`,
      expires_after: 1800, // 30 minutes
    });

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Create student checkout error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

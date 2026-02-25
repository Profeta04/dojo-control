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

    const { dojo_id } = await req.json();
    if (!dojo_id) throw new Error("dojo_id is required");

    const { data: integration } = await supabase
      .from("dojo_integrations")
      .select("*")
      .eq("dojo_id", dojo_id)
      .eq("integration_type", "stripe_connect")
      .maybeSingle();

    if (!integration?.access_token) {
      return new Response(
        JSON.stringify({ connected: false, charges_enabled: false, details_submitted: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const account = await stripe.accounts.retrieve(integration.access_token);

    const charges_enabled = account.charges_enabled || false;
    const details_submitted = account.details_submitted || false;

    // Update is_enabled based on actual Stripe status
    if (charges_enabled !== integration.is_enabled) {
      await supabase
        .from("dojo_integrations")
        .update({ is_enabled: charges_enabled, updated_at: new Date().toISOString() })
        .eq("id", integration.id);
    }

    return new Response(
      JSON.stringify({
        connected: true,
        charges_enabled,
        details_submitted,
        account_id: integration.access_token,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Stripe Connect status error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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

    const userId = userData.user.id;
    const { dojo_id } = await req.json();
    if (!dojo_id) throw new Error("dojo_id is required");

    // Verify user is sensei/owner of this dojo
    const { data: dojoSensei } = await supabase
      .from("dojo_senseis")
      .select("id")
      .eq("sensei_id", userId)
      .eq("dojo_id", dojo_id)
      .maybeSingle();

    if (!dojoSensei) {
      const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: userId });
      if (!isStaff) throw new Error("Not authorized for this dojo");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if dojo already has a Stripe Connect account
    const { data: existing } = await supabase
      .from("dojo_integrations")
      .select("*")
      .eq("dojo_id", dojo_id)
      .eq("integration_type", "stripe_connect")
      .maybeSingle();

    let accountId: string;

    if (existing?.access_token) {
      // Already has an account, create a new account link for re-onboarding
      accountId = existing.access_token;
      
      // Check if account is already fully onboarded
      const account = await stripe.accounts.retrieve(accountId);
      if (account.charges_enabled && account.details_submitted) {
        // Update as enabled
        await supabase
          .from("dojo_integrations")
          .update({ is_enabled: true, updated_at: new Date().toISOString() })
          .eq("id", existing.id);

        return new Response(
          JSON.stringify({ already_connected: true, charges_enabled: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Create a new Stripe Connect Express account
      const { data: dojo } = await supabase
        .from("dojos")
        .select("name, email")
        .eq("id", dojo_id)
        .single();

      const account = await stripe.accounts.create({
        type: "express",
        country: "BR",
        email: dojo?.email || userData.user.email || undefined,
        business_type: "individual",
        capabilities: {
          transfers: { requested: true },
        },
        business_profile: {
          name: dojo?.name || "Dojo",
          mcc: "7941", // Sports clubs/fields
        },
      });

      accountId = account.id;

      // Save to dojo_integrations
      if (existing) {
        await supabase
          .from("dojo_integrations")
          .update({ access_token: accountId, is_enabled: false, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("dojo_integrations").insert({
          dojo_id,
          integration_type: "stripe_connect",
          access_token: accountId,
          is_enabled: false,
        });
      }
    }

    // Create account link for onboarding
    const origin = req.headers.get("origin") || "https://dojo-control.lovable.app";
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/settings?stripe=refresh&dojo=${dojo_id}`,
      return_url: `${origin}/settings?stripe=success&dojo=${dojo_id}`,
      type: "account_onboarding",
    });

    return new Response(
      JSON.stringify({ url: accountLink.url, account_id: accountId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Stripe Connect onboard error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { guardianEmail, password } = await req.json();

    console.log("Verifying guardian password for:", guardianEmail);

    if (!guardianEmail || !password) {
      console.log("Missing required fields");
      return new Response(
        JSON.stringify({ success: false, error: "Email e senha são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a Supabase client with the service role key to verify credentials
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Try to sign in with the guardian credentials
    // This verifies the password without affecting the current session
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: guardianEmail,
      password: password,
    });

    if (error) {
      console.log("Guardian authentication failed:", error.message);
      return new Response(
        JSON.stringify({ success: false, error: "Senha incorreta" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (data.user) {
      console.log("Guardian password verified successfully");
      
      // Sign out the guardian session immediately (cleanup)
      await supabaseAdmin.auth.admin.signOut(data.session?.access_token ?? "");
      
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Erro ao verificar senha" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in verify-guardian-password:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

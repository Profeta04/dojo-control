import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BELT_GRADES = [
  "branca", "cinza", "azul", "amarela", "laranja", 
  "verde", "roxa", "marrom", "preta_1dan"
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require admin authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);
    const isAdmin = callerRoles?.some((r: any) => ["admin", "dono", "super_admin"].includes(r.role));
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: string[] = [];

    // 1. Create Dojo
    console.log("Creating test dojo...");
    const { data: dojoData, error: dojoError } = await supabaseAdmin
      .from("dojos")
      .insert({
        name: "Dojo Teste",
        email: "contato@dojoteste.com",
        phone: "(11) 99999-9999",
        address: "Rua do Judô, 123 - São Paulo/SP",
        description: "Dojo de teste para demonstração do sistema",
        is_active: true,
      })
      .select()
      .single();

    if (dojoError) {
      console.error("Error creating dojo:", dojoError);
      return new Response(
        JSON.stringify({ error: `Erro ao criar dojo: ${dojoError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dojoId = dojoData.id;
    results.push(`✅ Dojo criado: ${dojoData.name} (ID: ${dojoId})`);

    // 2. Create Sensei
    console.log("Creating sensei...");
    const senseiEmail = "sensei@teste.com";
    const senseiPassword = "Sensei123";

    const { data: senseiUser, error: senseiAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: senseiEmail,
      password: senseiPassword,
      email_confirm: true,
    });

    if (senseiAuthError) {
      console.error("Error creating sensei auth:", senseiAuthError);
      results.push(`❌ Erro ao criar sensei: ${senseiAuthError.message}`);
    } else {
      const senseiId = senseiUser.user.id;

      // Create sensei profile
      await supabaseAdmin.from("profiles").insert({
        user_id: senseiId,
        name: "Sensei Teste",
        email: senseiEmail,
        phone: "(11) 98888-8888",
        belt_grade: "preta_3dan",
        registration_status: "aprovado",
        dojo_id: dojoId,
      });

      // Assign sensei role
      await supabaseAdmin.from("user_roles").insert({
        user_id: senseiId,
        role: "sensei",
      });

      // Link sensei to dojo
      await supabaseAdmin.from("dojo_senseis").insert({
        dojo_id: dojoId,
        sensei_id: senseiId,
      });

      // Link to dojo_users
      await supabaseAdmin.from("dojo_users").insert({
        dojo_id: dojoId,
        user_id: senseiId,
      });

      results.push(`✅ Sensei criado: ${senseiEmail} / ${senseiPassword}`);
    }

    // 3. Create students for each belt
    console.log("Creating students...");
    for (const belt of BELT_GRADES) {
      const beltName = belt.replace("_1dan", "");
      const capitalizedBelt = beltName.charAt(0).toUpperCase() + beltName.slice(1);
      const studentEmail = `${beltName}@aluno.com`;
      const studentPassword = capitalizedBelt;
      const studentName = `Aluno Faixa ${capitalizedBelt}`;

      console.log(`Creating student: ${studentEmail}`);

      const { data: studentUser, error: studentAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: studentEmail,
        password: studentPassword,
        email_confirm: true,
      });

      if (studentAuthError) {
        console.error(`Error creating student ${belt}:`, studentAuthError);
        results.push(`❌ Erro ao criar aluno ${belt}: ${studentAuthError.message}`);
        continue;
      }

      const studentId = studentUser.user.id;

      // Create student profile
      await supabaseAdmin.from("profiles").insert({
        user_id: studentId,
        name: studentName,
        email: studentEmail,
        belt_grade: belt,
        registration_status: "aprovado",
        dojo_id: dojoId,
        birth_date: "2010-01-15",
      });

      // Assign student role
      await supabaseAdmin.from("user_roles").insert({
        user_id: studentId,
        role: "student",
      });

      // Link to dojo_users
      await supabaseAdmin.from("dojo_users").insert({
        dojo_id: dojoId,
        user_id: studentId,
      });

      results.push(`✅ Aluno criado: ${studentEmail} / ${studentPassword} (Faixa ${capitalizedBelt})`);
    }

    console.log("Seed completed!");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Dados de teste criados com sucesso!",
        results,
        dojo_id: dojoId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Unexpected error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Validate auth - only authenticated users can trigger this
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the caller is a real authenticated user
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader! } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { studentName, dojoId } = await req.json();

    if (!studentName || !dojoId) {
      return new Response(
        JSON.stringify({ error: 'studentName and dojoId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input lengths to prevent abuse
    if (typeof studentName !== "string" || studentName.length > 200 || typeof dojoId !== "string" || dojoId.length > 50) {
      return new Response(
        JSON.stringify({ error: "Invalid input" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const projectUrl = supabaseUrl;

    // Find all staff (senseis, admins) associated with this dojo
    const staffUserIds = new Set<string>();

    // Dojo senseis
    const { data: senseis } = await supabaseAdmin
      .from('dojo_senseis')
      .select('sensei_id')
      .eq('dojo_id', dojoId);
    senseis?.forEach(s => staffUserIds.add(s.sensei_id));

    // Admins (all admins get notified)
    const { data: admins } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');
    admins?.forEach(a => staffUserIds.add(a.user_id));

    if (staffUserIds.size === 0) {
      return new Response(
        JSON.stringify({ notified: 0, message: 'No staff found for this dojo' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let notified = 0;

    for (const userId of staffUserIds) {
      // Send push notification
      const pushRes = await fetch(`${projectUrl}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          userId,
          title: '🆕 Novo Cadastro Pendente',
          body: `${studentName} se cadastrou e aguarda aprovação.`,
          url: '/students',
          icon: '/favicon.png',
        }),
      });

      // In-app notification
      await supabaseAdmin.from('notifications').insert({
        user_id: userId,
        title: '🆕 Novo Cadastro Pendente',
        message: `${studentName} se cadastrou no dojo e aguarda aprovação.`,
        type: 'info',
      });

      if (pushRes.ok) notified++;
    }

    return new Response(
      JSON.stringify({ notified, totalStaff: staffUserIds.size }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

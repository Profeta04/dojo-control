import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-seed-key",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body = await req.json().catch(() => ({}));
    const dojoId = body.dojo_id;
    if (!dojoId) {
      return new Response(JSON.stringify({ error: "dojo_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: string[] = [];

    const BELT_GRADES = ["branca", "cinza", "azul", "amarela", "laranja", "verde", "roxa", "marrom", "preta_1dan"];
    const STUDENT_NAMES = ["Lucas Silva", "Maria Oliveira", "Pedro Santos", "Ana Costa", "João Pereira", "Camila Souza", "Rafael Lima", "Beatriz Almeida", "Gabriel Ferreira"];
    const PHONES = ["(11) 91234-5678", "(11) 92345-6789", "(11) 93456-7890", "(11) 94567-8901", "(11) 95678-9012", "(11) 96789-0123", "(11) 97890-1234", "(11) 98901-2345", "(11) 99012-3456"];

    // Get classes
    const { data: classes } = await supabaseAdmin.from("classes").select("id").eq("dojo_id", dojoId);
    const classIds = classes?.map((c: any) => c.id) || [];

    // Create Sensei
    const senseiEmail = "sensei.demo@dojocontrol.com";
    const { data: senseiUser, error: senseiErr } = await supabaseAdmin.auth.admin.createUser({
      email: senseiEmail, password: "Demo@2025", email_confirm: true,
    });
    if (senseiErr) {
      results.push(`⚠️ Sensei: ${senseiErr.message}`);
    } else {
      const sid = senseiUser.user.id;
      await supabaseAdmin.from("profiles").insert({ user_id: sid, name: "Sensei Takeshi Yamamoto", email: senseiEmail, phone: "(11) 99999-0000", belt_grade: "preta_3dan", registration_status: "aprovado", dojo_id: dojoId });
      await supabaseAdmin.from("user_roles").insert({ user_id: sid, role: "sensei" });
      await supabaseAdmin.from("dojo_senseis").insert({ dojo_id: dojoId, sensei_id: sid });
      await supabaseAdmin.from("dojo_users").insert({ dojo_id: dojoId, user_id: sid });
      results.push(`✅ Sensei: ${senseiEmail} / Demo@2025`);
    }

    // Create students
    const studentIds: string[] = [];
    for (let i = 0; i < BELT_GRADES.length; i++) {
      const belt = BELT_GRADES[i];
      const name = STUDENT_NAMES[i];
      const firstName = name.split(" ")[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const email = `${firstName}.demo${i}@dojocontrol.com`;

      const { data: su, error: se } = await supabaseAdmin.auth.admin.createUser({
        email, password: "Aluno@2025", email_confirm: true,
      });
      if (se) { results.push(`⚠️ ${name}: ${se.message}`); continue; }

      const uid = su.user.id;
      studentIds.push(uid);

      const birthYear = 2005 + (i % 8);
      await supabaseAdmin.from("profiles").insert({
        user_id: uid, name, email, phone: PHONES[i], belt_grade: belt,
        registration_status: "aprovado", dojo_id: dojoId,
        birth_date: `${birthYear}-0${(i % 9) + 1}-${10 + i}`,
        guardian_email: i < 4 ? `resp.${firstName}@email.com` : null,
        is_federated: i % 3 === 0,
      });
      await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: "student" });
      await supabaseAdmin.from("dojo_users").insert({ dojo_id: dojoId, user_id: uid });
      await supabaseAdmin.from("student_belts").insert({ user_id: uid, martial_art: "judo", belt_grade: belt });

      if (classIds.length > 0) {
        const ci = i < 4 ? 0 : (i < 7 ? 1 : 2);
        await supabaseAdmin.from("class_students").insert({ class_id: classIds[Math.min(ci, classIds.length - 1)], student_id: uid });
      }

      const xp = Math.floor(Math.random() * 2000) + 100;
      await supabaseAdmin.from("student_xp").insert({ user_id: uid, total_xp: xp, level: Math.floor(xp / 200) + 1, current_streak: Math.floor(Math.random() * 15), longest_streak: Math.floor(Math.random() * 30) + 5 });

      results.push(`✅ ${name} (${belt}) - ${email}`);
    }

    // Attendance
    const today = new Date();
    let ac = 0;
    for (const sid of studentIds) {
      for (let d = 1; d <= 20; d++) {
        const date = new Date(today); date.setDate(date.getDate() - d);
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        if (Math.random() > 0.8) continue;
        if (classIds.length > 0) {
          const { error } = await supabaseAdmin.from("attendance").insert({ class_id: classIds[0], student_id: sid, date: date.toISOString().split("T")[0], present: true });
          if (!error) ac++;
        }
      }
    }
    results.push(`✅ ${ac} presenças`);

    // Payments
    let pc = 0;
    for (const sid of studentIds) {
      for (let m = 0; m < 3; m++) {
        const ref = new Date(today.getFullYear(), today.getMonth() - m, 1);
        const due = new Date(today.getFullYear(), today.getMonth() - m, 10);
        const isPaid = m > 0 || Math.random() > 0.4;
        const isOverdue = !isPaid && due < today;
        const { error } = await supabaseAdmin.from("payments").insert({
          student_id: sid, amount: 150, due_date: due.toISOString().split("T")[0],
          reference_month: ref.toISOString().split("T")[0],
          status: isPaid ? "pago" : (isOverdue ? "atrasado" : "pendente"),
          paid_date: isPaid ? new Date(due.getTime() + Math.random() * 5 * 86400000).toISOString().split("T")[0] : null,
          description: "Judô Mensal", category: "mensalidade",
        });
        if (!error) pc++;
      }
    }
    results.push(`✅ ${pc} pagamentos`);

    // Graduations
    for (let i = 1; i < studentIds.length && i < BELT_GRADES.length; i++) {
      const gd = new Date(today); gd.setMonth(gd.getMonth() - (BELT_GRADES.length - i) * 4);
      await supabaseAdmin.from("graduation_history").insert({
        student_id: studentIds[i], from_belt: BELT_GRADES[i - 1], to_belt: BELT_GRADES[i],
        graduation_date: gd.toISOString().split("T")[0], martial_art: "judo", notes: "Aprovado em exame de faixa",
      });
    }
    results.push(`✅ Graduações criadas`);

    return new Response(JSON.stringify({ success: true, results, dojo_id: dojoId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- AUTH: Only allow service role or authenticated staff ---
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isServiceRole = token === serviceRoleKey;

    if (!isServiceRole) {
      // Validate user token and check staff role
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader! } },
      });
      const { data: userData, error: userError } = await userClient.auth.getUser();
      if (userError || !userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { data: isStaff } = await adminClient.rpc("is_staff", { _user_id: userData.user.id });
      if (!isStaff) {
        return new Response(JSON.stringify({ error: "Forbidden: staff only" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all active fee plans with their martial_art_type
    const { data: plans, error: plansError } = await supabase
      .from("monthly_fee_plans")
      .select("*")
      .eq("is_active", true);

    if (plansError) throw plansError;
    if (!plans || plans.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active plans found", generated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all active classes with their martial_art
    const { data: allClasses, error: classesError } = await supabase
      .from("classes")
      .select("id, martial_art, dojo_id")
      .eq("is_active", true);

    if (classesError) throw classesError;

    // Get all enrollments
    const { data: allEnrollments, error: enrollError } = await supabase
      .from("class_students")
      .select("student_id, class_id");

    if (enrollError) throw enrollError;

    // Build map: classId -> martial_art
    const classArtMap = new Map<string, string>();
    const classDojoMap = new Map<string, string>();
    for (const cls of allClasses || []) {
      classArtMap.set(cls.id, cls.martial_art);
      classDojoMap.set(cls.id, cls.dojo_id);
    }

    // Build map: studentId -> Set of martial arts they're enrolled in (per dojo)
    const studentArtsMap = new Map<string, { arts: Set<string>; dojoId: string }>();
    for (const e of allEnrollments || []) {
      const art = classArtMap.get(e.class_id);
      const dojoId = classDojoMap.get(e.class_id);
      if (!art || !dojoId) continue;

      const existing = studentArtsMap.get(e.student_id);
      if (existing) {
        existing.arts.add(art);
      } else {
        studentArtsMap.set(e.student_id, { arts: new Set([art]), dojoId });
      }
    }

    const now = new Date();
    const referenceMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    // Group plans by dojo
    const plansByDojo = new Map<string, typeof plans>();
    for (const plan of plans) {
      const list = plansByDojo.get(plan.dojo_id) || [];
      list.push(plan);
      plansByDojo.set(plan.dojo_id, list);
    }

    // Collect all student IDs to check scholarships
    const allStudentIds = [...studentArtsMap.keys()];
    if (allStudentIds.length === 0) {
      return new Response(
        JSON.stringify({ message: "No students enrolled", generated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Exclude scholarship students
    const { data: scholarshipStudents } = await supabase
      .from("profiles")
      .select("user_id")
      .in("user_id", allStudentIds)
      .eq("is_scholarship", true);

    const scholarshipIds = new Set(
      (scholarshipStudents || []).map((s: any) => s.user_id)
    );

    // Get existing mensalidade payments this month
    const { data: existingPayments } = await supabase
      .from("payments")
      .select("id, student_id, description")
      .in("student_id", allStudentIds)
      .eq("reference_month", referenceMonth)
      .eq("category", "mensalidade");

    const existingByStudent = new Map<string, any[]>();
    for (const p of existingPayments || []) {
      const list = existingByStudent.get(p.student_id) || [];
      list.push(p);
      existingByStudent.set(p.student_id, list);
    }

    const paymentsToInsert: any[] = [];
    const paymentsToDelete: string[] = [];
    const notificationsToInsert: any[] = [];

    // Process each student
    for (const [studentId, { arts, dojoId }] of studentArtsMap.entries()) {
      if (scholarshipIds.has(studentId)) continue;

      const dojoPlans = plansByDojo.get(dojoId);
      if (!dojoPlans) continue;

      const hasJudo = arts.has("judo");
      const hasBjj = arts.has("bjj") || arts.has("jiu-jitsu");

      // Find applicable plan
      let applicablePlan: any = null;

      if (hasJudo && hasBjj) {
        // Student does both arts - look for judo_bjj plan first
        applicablePlan = dojoPlans.find((p: any) => p.martial_art_type === "judo_bjj");
      }

      if (!applicablePlan && hasJudo) {
        if (!(hasJudo && hasBjj)) {
          applicablePlan = dojoPlans.find((p: any) => p.martial_art_type === "judo");
        }
      }

      if (!applicablePlan && hasBjj) {
        if (!(hasJudo && hasBjj)) {
          applicablePlan = dojoPlans.find((p: any) => p.martial_art_type === "bjj");
        }
      }

      // If student does both and we found a combined plan
      if (hasJudo && hasBjj) {
        const combinedPlan = dojoPlans.find((p: any) => p.martial_art_type === "judo_bjj");
        if (combinedPlan) {
          applicablePlan = combinedPlan;
        } else {
          const judoPlan = dojoPlans.find((p: any) => p.martial_art_type === "judo");
          const bjjPlan = dojoPlans.find((p: any) => p.martial_art_type === "bjj");
          
          for (const plan of [judoPlan, bjjPlan]) {
            if (!plan) continue;
            const existing = existingByStudent.get(studentId) || [];
            const alreadyHas = existing.some((p: any) => p.description === plan.name);
            if (alreadyHas) continue;

            const dueDay = Math.min(plan.due_day, 28);
            const dueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`;

            paymentsToInsert.push({
              student_id: studentId,
              category: "mensalidade",
              reference_month: referenceMonth,
              due_date: dueDate,
              amount: plan.amount,
              description: plan.name,
              status: "pendente",
            });

            notificationsToInsert.push({
              user_id: studentId,
              title: "💳 Nova Mensalidade",
              message: `Sua mensalidade de R$ ${Number(plan.amount).toFixed(2)} (${plan.name}) foi gerada. Vencimento: ${dueDay}/${String(now.getMonth() + 1).padStart(2, "0")}.`,
              type: "payment",
            });
          }
          continue;
        }
      }

      if (!applicablePlan) continue;

      const existing = existingByStudent.get(studentId) || [];

      const alreadyHas = existing.some((p: any) => p.description === applicablePlan.name);
      if (alreadyHas) continue;

      if (applicablePlan.martial_art_type === "judo_bjj") {
        for (const ep of existing) {
          paymentsToDelete.push(ep.id);
        }
      }

      const dueDay = Math.min(applicablePlan.due_day, 28);
      const dueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`;

      paymentsToInsert.push({
        student_id: studentId,
        category: "mensalidade",
        reference_month: referenceMonth,
        due_date: dueDate,
        amount: applicablePlan.amount,
        description: applicablePlan.name,
        status: "pendente",
      });

      notificationsToInsert.push({
        user_id: studentId,
        title: "💳 Nova Mensalidade",
        message: `Sua mensalidade de R$ ${Number(applicablePlan.amount).toFixed(2)} (${applicablePlan.name}) foi gerada. Vencimento: ${dueDay}/${String(now.getMonth() + 1).padStart(2, "0")}.`,
        type: "payment",
      });
    }

    let totalReplaced = paymentsToDelete.length;

    if (paymentsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("payments")
        .delete()
        .in("id", paymentsToDelete);
      if (deleteError) console.error("Error deleting old payments:", deleteError);
    }

    let totalGenerated = 0;
    if (paymentsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("payments")
        .insert(paymentsToInsert);
      if (insertError) throw insertError;
      totalGenerated = paymentsToInsert.length;
    }

    if (notificationsToInsert.length > 0) {
      await supabase.from("notifications").insert(notificationsToInsert);
    }

    return new Response(
      JSON.stringify({
        message: `Generated ${totalGenerated} payments, replaced ${totalReplaced}`,
        generated: totalGenerated,
        replaced: totalReplaced,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating monthly payments:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

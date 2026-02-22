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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all active fee plans
    const { data: plans, error: plansError } = await supabase
      .from("monthly_fee_plans")
      .select("*, monthly_fee_plan_classes(class_id)")
      .eq("is_active", true);

    if (plansError) throw plansError;
    if (!plans || plans.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active plans found", generated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const referenceMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    let totalGenerated = 0;
    let totalReplaced = 0;

    // Build a map: studentId -> list of plans they belong to
    const studentPlansMap = new Map<string, typeof plans>();

    for (const plan of plans) {
      const classIds = (plan.monthly_fee_plan_classes || []).map(
        (pc: any) => pc.class_id
      );
      if (classIds.length === 0) continue;

      const { data: enrollments, error: enrollError } = await supabase
        .from("class_students")
        .select("student_id")
        .in("class_id", classIds);

      if (enrollError) {
        console.error(`Error fetching enrollments for plan ${plan.id}:`, enrollError);
        continue;
      }

      const studentIds = [...new Set((enrollments || []).map((e: any) => e.student_id))];
      for (const sid of studentIds) {
        const existing = studentPlansMap.get(sid) || [];
        // Avoid duplicate plans for same student
        if (!existing.find((p: any) => p.id === plan.id)) {
          existing.push(plan);
          studentPlansMap.set(sid, existing);
        }
      }
    }

    if (studentPlansMap.size === 0) {
      return new Response(
        JSON.stringify({ message: "No students enrolled in active plans", generated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allStudentIds = [...studentPlansMap.keys()];

    // Exclude scholarship students
    const { data: scholarshipStudents } = await supabase
      .from("profiles")
      .select("user_id")
      .in("user_id", allStudentIds)
      .eq("is_scholarship", true);

    const scholarshipIds = new Set(
      (scholarshipStudents || []).map((s: any) => s.user_id)
    );

    // Get existing mensalidade payments this month for all students
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

    for (const [studentId, studentPlans] of studentPlansMap.entries()) {
      if (scholarshipIds.has(studentId)) continue;

      // Calculate what the student should have
      const totalAmount = studentPlans.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      const planNames = studentPlans.map((p: any) => p.name).sort().join(" + ");
      const maxDueDay = Math.min(Math.max(...studentPlans.map((p: any) => p.due_day)), 28);
      const dueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(maxDueDay).padStart(2, "0")}`;

      const existing = existingByStudent.get(studentId) || [];

      if (studentPlans.length > 1) {
        // Multi-plan student: check if they have the correct combined payment
        const hasCombined = existing.some((p: any) => p.description === planNames);

        if (hasCombined) {
          // Already has the correct combined payment, skip
          continue;
        }

        // Delete any existing single-plan payments for this month
        for (const ep of existing) {
          paymentsToDelete.push(ep.id);
          totalReplaced++;
        }

        // Create combined payment
        paymentsToInsert.push({
          student_id: studentId,
          category: "mensalidade",
          reference_month: referenceMonth,
          due_date: dueDate,
          amount: totalAmount,
          description: planNames,
          status: "pendente",
        });

        notificationsToInsert.push({
          user_id: studentId,
          title: "💳 Nova Mensalidade",
          message: `Sua mensalidade combinada de R$ ${totalAmount.toFixed(2)} (${planNames}) para ${new Date(now.getFullYear(), now.getMonth()).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })} foi gerada. Vencimento: ${maxDueDay}/${String(now.getMonth() + 1).padStart(2, "0")}.`,
          type: "payment",
        });
      } else {
        // Single plan student
        if (existing.length > 0) {
          // Already has a payment, skip
          continue;
        }

        const plan = studentPlans[0];
        const dueDay = Math.min(plan.due_day, 28);
        const singleDueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`;

        paymentsToInsert.push({
          student_id: studentId,
          category: "mensalidade",
          reference_month: referenceMonth,
          due_date: singleDueDate,
          amount: plan.amount,
          description: plan.name,
          status: "pendente",
        });

        notificationsToInsert.push({
          user_id: studentId,
          title: "💳 Nova Mensalidade",
          message: `Sua mensalidade de R$ ${Number(plan.amount).toFixed(2)} para ${new Date(now.getFullYear(), now.getMonth()).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })} foi gerada. Vencimento: ${dueDay}/${String(now.getMonth() + 1).padStart(2, "0")}.`,
          type: "payment",
        });
      }
    }

    // Delete old single-art payments that need to be replaced
    if (paymentsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("payments")
        .delete()
        .in("id", paymentsToDelete);
      if (deleteError) {
        console.error("Error deleting old payments:", deleteError);
      }
    }

    // Insert new payments
    if (paymentsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("payments")
        .insert(paymentsToInsert);
      if (insertError) {
        console.error("Error inserting payments:", insertError);
        throw insertError;
      }
      totalGenerated = paymentsToInsert.length;
    }

    // Send notifications
    if (notificationsToInsert.length > 0) {
      await supabase.from("notifications").insert(notificationsToInsert);
    }

    return new Response(
      JSON.stringify({
        message: `Generated ${totalGenerated} payments, replaced ${totalReplaced} single-art payments`,
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

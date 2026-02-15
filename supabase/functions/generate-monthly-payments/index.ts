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

    for (const plan of plans) {
      const classIds = (plan.monthly_fee_plan_classes || []).map(
        (pc: any) => pc.class_id
      );
      if (classIds.length === 0) continue;

      // Get students enrolled in these classes
      const { data: enrollments, error: enrollError } = await supabase
        .from("class_students")
        .select("student_id")
        .in("class_id", classIds);

      if (enrollError) {
        console.error(`Error fetching enrollments for plan ${plan.id}:`, enrollError);
        continue;
      }

      const studentIds = [...new Set((enrollments || []).map((e: any) => e.student_id))];
      if (studentIds.length === 0) continue;

      // Exclude scholarship students
      const { data: scholarshipStudents } = await supabase
        .from("profiles")
        .select("user_id")
        .in("user_id", studentIds)
        .eq("is_scholarship", true);

      const scholarshipIds = new Set(
        (scholarshipStudents || []).map((s: any) => s.user_id)
      );
      const eligibleStudents = studentIds.filter(
        (id: string) => !scholarshipIds.has(id)
      );
      if (eligibleStudents.length === 0) continue;

      // Check for existing mensalidade payments this month
      const { data: existingPayments } = await supabase
        .from("payments")
        .select("student_id")
        .in("student_id", eligibleStudents)
        .eq("reference_month", referenceMonth)
        .eq("category", "mensalidade");

      const existingIds = new Set(
        (existingPayments || []).map((p: any) => p.student_id)
      );
      const newStudents = eligibleStudents.filter(
        (id: string) => !existingIds.has(id)
      );
      if (newStudents.length === 0) continue;

      // Calculate due date
      const dueDay = Math.min(plan.due_day, 28);
      const dueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`;

      const paymentsToInsert = newStudents.map((studentId: string) => ({
        student_id: studentId,
        category: "mensalidade",
        reference_month: referenceMonth,
        due_date: dueDate,
        amount: plan.amount,
        description: plan.name,
        status: "pendente",
      }));

      const { error: insertError } = await supabase
        .from("payments")
        .insert(paymentsToInsert);

      if (insertError) {
        console.error(`Error inserting payments for plan ${plan.id}:`, insertError);
        continue;
      }

      totalGenerated += newStudents.length;

      // Send notifications to students
      const notifications = newStudents.map((studentId: string) => ({
        user_id: studentId,
        title: "💳 Nova Mensalidade",
        message: `Sua mensalidade de R$ ${Number(plan.amount).toFixed(2)} para ${new Date(now.getFullYear(), now.getMonth()).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })} foi gerada. Vencimento: ${dueDay}/${String(now.getMonth() + 1).padStart(2, "0")}.`,
        type: "payment",
      }));

      await supabase.from("notifications").insert(notifications);
    }

    return new Response(
      JSON.stringify({
        message: `Generated ${totalGenerated} payments`,
        generated: totalGenerated,
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

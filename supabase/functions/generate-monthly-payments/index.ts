import {
  createHandler, verifyStaff, getServiceClient,
  jsonResponse, safeLog,
} from "../_shared/validation.ts";

Deno.serve(createHandler(async (req) => {
  // Auth: staff or service role
  const auth = await verifyStaff(req);
  if (auth instanceof Response) return auth;

  safeLog("GENERATE_MONTHLY_PAYMENTS", { callerUserId: auth.userId });

  const supabase = getServiceClient();

  // Get all active fee plans
  const { data: plans, error: plansError } = await supabase
    .from("monthly_fee_plans")
    .select("*")
    .eq("is_active", true);

  if (plansError) throw plansError;
  if (!plans || plans.length === 0) {
    return jsonResponse({ message: "No active plans found", generated: 0 });
  }

  // Get all active classes
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

  // Build maps
  const classArtMap = new Map<string, string>();
  const classDojoMap = new Map<string, string>();
  for (const cls of allClasses || []) {
    classArtMap.set(cls.id, cls.martial_art);
    classDojoMap.set(cls.id, cls.dojo_id);
  }

  const studentArtsMap = new Map<string, { arts: Set<string>; dojoId: string }>();
  for (const e of allEnrollments || []) {
    const art = classArtMap.get(e.class_id);
    const dojoId = classDojoMap.get(e.class_id);
    if (!art || !dojoId) continue;
    const existing = studentArtsMap.get(e.student_id);
    if (existing) existing.arts.add(art);
    else studentArtsMap.set(e.student_id, { arts: new Set([art]), dojoId });
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

  const allStudentIds = [...studentArtsMap.keys()];
  if (allStudentIds.length === 0) {
    return jsonResponse({ message: "No students enrolled", generated: 0 });
  }

  // Exclude scholarship students
  const { data: scholarshipStudents } = await supabase
    .from("profiles")
    .select("user_id")
    .in("user_id", allStudentIds)
    .eq("is_scholarship", true);

  const scholarshipIds = new Set((scholarshipStudents || []).map((s: { user_id: string }) => s.user_id));

  // Get existing payments this month
  const { data: existingPayments } = await supabase
    .from("payments")
    .select("id, student_id, description")
    .in("student_id", allStudentIds)
    .eq("reference_month", referenceMonth)
    .eq("category", "mensalidade");

  const existingByStudent = new Map<string, { id: string; description: string }[]>();
  for (const p of existingPayments || []) {
    const list = existingByStudent.get(p.student_id) || [];
    list.push(p);
    existingByStudent.set(p.student_id, list);
  }

  const paymentsToInsert: Record<string, unknown>[] = [];
  const paymentsToDelete: string[] = [];
  const notificationsToInsert: Record<string, unknown>[] = [];

  for (const [studentId, { arts, dojoId }] of studentArtsMap.entries()) {
    if (scholarshipIds.has(studentId)) continue;

    const dojoPlans = plansByDojo.get(dojoId);
    if (!dojoPlans) continue;

    const hasJudo = arts.has("judo");
    const hasBjj = arts.has("bjj") || arts.has("jiu-jitsu");

    let applicablePlan: Record<string, unknown> | null = null;

    if (hasJudo && hasBjj) {
      const combinedPlan = dojoPlans.find((p) => p.martial_art_type === "judo_bjj");
      if (combinedPlan) {
        applicablePlan = combinedPlan;
      } else {
        // Generate individual plans for each art
        const judoPlan = dojoPlans.find((p) => p.martial_art_type === "judo");
        const bjjPlan = dojoPlans.find((p) => p.martial_art_type === "bjj");

        for (const plan of [judoPlan, bjjPlan]) {
          if (!plan) continue;
          const existing = existingByStudent.get(studentId) || [];
          if (existing.some((p) => p.description === plan.name)) continue;

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

    if (!applicablePlan && hasJudo) {
      applicablePlan = dojoPlans.find((p) => p.martial_art_type === "judo") || null;
    }
    if (!applicablePlan && hasBjj) {
      applicablePlan = dojoPlans.find((p) => p.martial_art_type === "bjj") || null;
    }
    if (!applicablePlan) continue;

    const existing = existingByStudent.get(studentId) || [];
    if (existing.some((p) => p.description === (applicablePlan as Record<string, unknown>).name)) continue;

    // If combined plan, delete individual art payments
    if ((applicablePlan as Record<string, unknown>).martial_art_type === "judo_bjj") {
      for (const ep of existing) paymentsToDelete.push(ep.id);
    }

    const dueDay = Math.min(Number((applicablePlan as Record<string, unknown>).due_day) || 10, 28);
    const dueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`;

    paymentsToInsert.push({
      student_id: studentId,
      category: "mensalidade",
      reference_month: referenceMonth,
      due_date: dueDate,
      amount: (applicablePlan as Record<string, unknown>).amount,
      description: (applicablePlan as Record<string, unknown>).name,
      status: "pendente",
    });

    notificationsToInsert.push({
      user_id: studentId,
      title: "💳 Nova Mensalidade",
      message: `Sua mensalidade de R$ ${Number((applicablePlan as Record<string, unknown>).amount).toFixed(2)} (${(applicablePlan as Record<string, unknown>).name}) foi gerada. Vencimento: ${dueDay}/${String(now.getMonth() + 1).padStart(2, "0")}.`,
      type: "payment",
    });
  }

  const totalReplaced = paymentsToDelete.length;

  if (paymentsToDelete.length > 0) {
    await supabase.from("payments").delete().in("id", paymentsToDelete);
  }

  let totalGenerated = 0;
  if (paymentsToInsert.length > 0) {
    const { error: insertError } = await supabase.from("payments").insert(paymentsToInsert);
    if (insertError) throw insertError;
    totalGenerated = paymentsToInsert.length;
  }

  if (notificationsToInsert.length > 0) {
    await supabase.from("notifications").insert(notificationsToInsert);
  }

  safeLog("PAYMENTS_GENERATED", { generated: totalGenerated, replaced: totalReplaced });

  return jsonResponse({
    message: `Generated ${totalGenerated} payments, replaced ${totalReplaced}`,
    generated: totalGenerated,
    replaced: totalReplaced,
  });
}));

import {
  createHandler, verifyAuth, getServiceClient,
  jsonResponse, safeLog,
} from "../_shared/validation.ts";

Deno.serve(createHandler(async (req) => {
  const auth = await verifyAuth(req);
  if (auth instanceof Response) return auth;

  const supabaseAdmin = getServiceClient();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const dayName = dayNames[tomorrow.getDay()];

  const { data: schedules } = await supabaseAdmin
    .from("class_schedule")
    .select("id, class_id, start_time, end_time, classes(id, name, dojo_id)")
    .eq("date", tomorrowStr)
    .eq("is_cancelled", false);

  if (!schedules || schedules.length === 0) {
    return jsonResponse({ notified: 0, message: "No classes tomorrow" });
  }

  // Collect all class IDs to batch-query enrollments
  const classIds = schedules.map((s) => s.class_id);

  const { data: allEnrollments } = await supabaseAdmin
    .from("class_students")
    .select("student_id, class_id")
    .in("class_id", classIds);

  if (!allEnrollments || allEnrollments.length === 0) {
    return jsonResponse({ notified: 0, message: "No enrolled students" });
  }

  // Build map: classId -> className + startTime
  const classInfoMap = new Map<string, { name: string; startTime: string }>();
  for (const schedule of schedules) {
    const cls = Array.isArray(schedule.classes) ? schedule.classes[0] : schedule.classes as Record<string, unknown>;
    if (!cls) continue;
    classInfoMap.set(schedule.class_id, {
      name: (cls as Record<string, unknown>).name as string || "Treino",
      startTime: schedule.start_time?.slice(0, 5) || "?",
    });
  }

  // Collect unique students to notify (avoid duplicates for multi-class students)
  const notifiedStudents = new Set<string>();
  const notificationRows = [];

  for (const enrollment of allEnrollments) {
    if (notifiedStudents.has(enrollment.student_id)) continue;
    notifiedStudents.add(enrollment.student_id);

    const info = classInfoMap.get(enrollment.class_id);
    const className = info?.name || "Treino";
    const startTime = info?.startTime || "?";

    notificationRows.push({
      user_id: enrollment.student_id,
      title: `📅 Treino amanhã — ${dayName}`,
      message: `${className} às ${startTime}h. Prepare seu kimono! 🥋`,
      type: "info",
    });
  }

  // Batch insert in-app notifications
  if (notificationRows.length > 0) {
    await supabaseAdmin.from("notifications").insert(notificationRows);
  }

  // Batch push notification
  const allStudentIds = [...notifiedStudents];
  let sent = 0;

  for (let i = 0; i < allStudentIds.length; i += 500) {
    const chunk = allStudentIds.slice(i, i + 500);
    try {
      const pushRes = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          userIds: chunk,
          title: `📅 Treino amanhã — ${dayName}`,
          body: "Prepare seu kimono para o treino de amanhã! 🥋",
          url: "/agenda",
          icon: "/favicon.png",
        }),
      });

      if (pushRes.ok) {
        const result = await pushRes.json();
        sent += result.sent || 0;
      } else {
        await pushRes.text();
      }
    } catch {
      // Continue
    }
  }

  safeLog("TRAINING_REMINDERS_SENT", { notified: sent, classes: schedules.length });
  return jsonResponse({ notified: sent, classes: schedules.length });
}, { rateLimit: false }));

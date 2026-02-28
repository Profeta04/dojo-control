import {
  createHandler, verifyAuth, getServiceClient,
  jsonResponse, safeLog,
} from "../_shared/validation.ts";

Deno.serve(createHandler(async (req) => {
  // Service role or anon key (cron)
  const auth = await verifyAuth(req);
  if (auth instanceof Response) return auth;

  const supabaseAdmin = getServiceClient();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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

  const notifiedStudents = new Set<string>();
  let notified = 0;

  for (const schedule of schedules) {
    const cls = Array.isArray(schedule.classes) ? schedule.classes[0] : schedule.classes as Record<string, unknown>;
    if (!cls) continue;

    const { data: enrollments } = await supabaseAdmin
      .from("class_students")
      .select("student_id")
      .eq("class_id", schedule.class_id);

    if (!enrollments?.length) continue;

    const startTime = schedule.start_time?.slice(0, 5) || "?";
    const className = (cls as Record<string, unknown>).name || "Treino";

    for (const enrollment of enrollments) {
      const studentId = enrollment.student_id;
      if (notifiedStudents.has(studentId)) continue;

      try {
        const pushRes = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            userId: studentId,
            title: `📅 Treino amanhã — ${dayName}`,
            body: `${className} às ${startTime}h. Prepare seu kimono! 🥋`,
            url: "/agenda",
            icon: "/favicon.png",
          }),
        });

        if (pushRes.ok) {
          await supabaseAdmin.from("notifications").insert({
            user_id: studentId,
            title: `📅 Treino amanhã — ${dayName}`,
            message: `${className} às ${startTime}h. Prepare seu kimono! 🥋`,
            type: "info",
          });
          notifiedStudents.add(studentId);
          notified++;
        }
      } catch {
        // Continue with others
      }
    }
  }

  safeLog("TRAINING_REMINDERS_SENT", { notified, classes: schedules.length });
  return jsonResponse({ notified, classes: schedules.length });
}, { rateLimit: false }));

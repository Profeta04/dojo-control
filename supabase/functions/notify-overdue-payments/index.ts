import {
  createHandler, verifyAuth, getServiceClient,
  jsonResponse, safeLog, corsHeaders,
} from "../_shared/validation.ts";

Deno.serve(createHandler(async (req) => {
  const auth = await verifyAuth(req);
  if (auth instanceof Response) return auth;

  const supabaseAdmin = getServiceClient();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Find overdue payments
  const { data: overduePayments } = await supabaseAdmin
    .from("payments")
    .select("student_id, due_date, amount, description")
    .eq("status", "atrasado")
    .order("due_date", { ascending: true });

  if (!overduePayments || overduePayments.length === 0) {
    return jsonResponse({ notified: 0 });
  }

  // Group by student
  const studentMap = new Map<string, { count: number; oldest: string }>();
  for (const p of overduePayments) {
    const existing = studentMap.get(p.student_id);
    if (!existing || p.due_date < existing.oldest) {
      studentMap.set(p.student_id, {
        count: (existing?.count || 0) + 1,
        oldest: p.due_date,
      });
    } else {
      studentMap.set(p.student_id, { count: existing.count + 1, oldest: existing.oldest });
    }
  }

  // Insert in-app notifications in batch
  const notificationRows = [];
  const pushPayloads = [];

  for (const [studentId, info] of studentMap) {
    const body = info.count === 1
      ? "Você possui 1 pagamento em atraso. Regularize para evitar bloqueio."
      : `Você possui ${info.count} pagamentos em atraso. Regularize para evitar bloqueio.`;

    notificationRows.push({
      user_id: studentId,
      title: "⚠️ Pagamento em Atraso",
      message: body,
      type: "payment",
    });

    pushPayloads.push({ studentId, body });
  }

  // Batch insert in-app notifications
  if (notificationRows.length > 0) {
    await supabaseAdmin.from("notifications").insert(notificationRows);
  }

  // Batch push notification — single call with all userIds
  const allStudentIds = [...studentMap.keys()];
  let sent = 0;

  // Send in chunks of 500 to stay within limits
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
          title: "⚠️ Pagamento em Atraso",
          body: "Você possui pagamentos em atraso. Regularize para evitar bloqueio.",
          url: "/mensalidade",
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

  safeLog("OVERDUE_NOTIFICATIONS_SENT", { notified: sent, total: studentMap.size });
  return jsonResponse({ notified: sent, total: studentMap.size });
}, { rateLimit: false }));

import {
  createHandler, verifyAuth, getServiceClient,
  jsonResponse, safeLog, corsHeaders,
} from "../_shared/validation.ts";

Deno.serve(createHandler(async (req) => {
  // Only allow service role or anon key (internal cron calls)
  const auth = await verifyAuth(req);
  if (auth instanceof Response) return auth;

  const supabaseAdmin = getServiceClient();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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

  let notified = 0;
  for (const [studentId, info] of studentMap) {
    const body = info.count === 1
      ? "Você possui 1 pagamento em atraso. Regularize para evitar bloqueio."
      : `Você possui ${info.count} pagamentos em atraso. Regularize para evitar bloqueio.`;

    try {
      const pushRes = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          userId: studentId,
          title: "⚠️ Pagamento em Atraso",
          body,
          url: "/mensalidade",
          icon: "/favicon.png",
        }),
      });

      if (pushRes.ok) {
        await supabaseAdmin.from("notifications").insert({
          user_id: studentId,
          title: "⚠️ Pagamento em Atraso",
          message: body,
          type: "payment",
        });
        notified++;
      }
    } catch {
      // Continue with other students
    }
  }

  safeLog("OVERDUE_NOTIFICATIONS_SENT", { notified, total: studentMap.size });
  return jsonResponse({ notified, total: studentMap.size });
}, { rateLimit: false }));

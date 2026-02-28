import {
  createHandler, verifyAuth, parseBody, getServiceClient,
  validateString, validateUUID,
  jsonResponse, errorResponse, safeLog, corsHeaders,
} from "../_shared/validation.ts";

Deno.serve(createHandler(async (req) => {
  // Any authenticated user can trigger this (newly registered student)
  const auth = await verifyAuth(req);
  if (auth instanceof Response) return auth;

  const body = await parseBody<Record<string, unknown>>(req);
  if (body instanceof Response) return body;

  const studentName = validateString(body.studentName, "studentName", { maxLen: 200 });
  const dojoId = validateUUID(body.dojoId, "dojoId");

  if (!studentName) return errorResponse("studentName é obrigatório", 400);

  safeLog("NOTIFY_NEW_STUDENT", { dojoId });

  const supabaseAdmin = getServiceClient();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Find staff for this dojo
  const staffUserIds = new Set<string>();

  const { data: senseis } = await supabaseAdmin
    .from("dojo_senseis")
    .select("sensei_id")
    .eq("dojo_id", dojoId);
  senseis?.forEach((s: { sensei_id: string }) => staffUserIds.add(s.sensei_id));

  const { data: admins } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  admins?.forEach((a: { user_id: string }) => staffUserIds.add(a.user_id));

  if (staffUserIds.size === 0) {
    return jsonResponse({ notified: 0, message: "No staff found for this dojo" });
  }

  let notified = 0;
  for (const userId of staffUserIds) {
    try {
      const pushRes = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          userId,
          title: "🆕 Novo Cadastro Pendente",
          body: `${studentName} se cadastrou e aguarda aprovação.`,
          url: "/students",
          icon: "/favicon.png",
        }),
      });

      await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        title: "🆕 Novo Cadastro Pendente",
        message: `${studentName} se cadastrou no dojo e aguarda aprovação.`,
        type: "info",
      });

      if (pushRes.ok) notified++;
    } catch {
      // Continue notifying others even if one fails
    }
  }

  return jsonResponse({ notified, totalStaff: staffUserIds.size });
}));

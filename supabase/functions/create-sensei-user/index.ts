import {
  createHandler, verifyRole, parseBody, getServiceClient,
  validateEmail, validateString, validateUUID,
  jsonResponse, errorResponse, safeLog,
} from "../_shared/validation.ts";

Deno.serve(createHandler(async (req) => {
  // Auth: only admin/dono/super_admin
  const auth = await verifyRole(req, ["admin", "dono", "super_admin"]);
  if (auth instanceof Response) return auth;

  // Parse & validate body
  const body = await parseBody<Record<string, unknown>>(req);
  if (body instanceof Response) return body;

  const email = validateEmail(body.email);
  const password = validateString(body.password, "password", { minLen: 6, maxLen: 128 });
  const name = validateString(body.name, "name", { minLen: 2, maxLen: 200 });
  const phone = validateString(body.phone, "phone", { required: false, maxLen: 20 });
  const beltGrade = validateString(body.belt_grade, "belt_grade", { required: false, maxLen: 30 });

  if (!password) return errorResponse("Senha é obrigatória", 400);

  safeLog("CREATE_SENSEI", { callerUserId: auth.userId });

  const supabaseAdmin = getServiceClient();

  // Create user via admin API (does NOT affect caller session)
  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (createError) {
    return errorResponse(createError.message, 400);
  }

  const userId = userData.user.id;

  // Update profile
  const updateData: Record<string, unknown> = {
    registration_status: "aprovado",
    approved_at: new Date().toISOString(),
    approved_by: auth.userId,
  };
  if (phone) updateData.phone = phone;
  if (beltGrade) updateData.belt_grade = beltGrade;

  await supabaseAdmin.from("profiles").update(updateData).eq("user_id", userId);

  // Assign sensei role
  await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "sensei" });

  safeLog("SENSEI_CREATED", { userId });

  return jsonResponse({ success: true, user_id: userId });
}));

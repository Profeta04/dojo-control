import {
  createHandler, verifyRole, parseBody, getServiceClient,
  validateEmail, validateString,
  jsonResponse, errorResponse, safeLog,
} from "../_shared/validation.ts";

Deno.serve(createHandler(async (req) => {
  // Auth: only admin/dono
  const auth = await verifyRole(req, ["admin", "dono"]);
  if (auth instanceof Response) return auth;

  // Parse & validate body
  const body = await parseBody<Record<string, unknown>>(req);
  if (body instanceof Response) return body;

  const email = validateEmail(body.email);
  const password = validateString(body.password, "password", { minLen: 6, maxLen: 128 });
  const name = validateString(body.name, "name", { minLen: 2, maxLen: 200 });

  if (!password) return errorResponse("Senha é obrigatória", 400);

  safeLog("CREATE_ADMIN", { callerUserId: auth.userId });

  const supabaseAdmin = getServiceClient();

  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    return errorResponse(createError.message, 400);
  }

  const userId = userData.user.id;

  // Create profile
  await supabaseAdmin.from("profiles").insert({
    user_id: userId,
    name,
    email,
    registration_status: "aprovado",
  });

  // Assign admin role
  await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });

  safeLog("ADMIN_CREATED", { userId });

  return jsonResponse({ success: true, user_id: userId });
}));

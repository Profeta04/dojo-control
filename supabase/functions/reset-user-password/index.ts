import {
  createHandler, verifyStaff, parseBody, getServiceClient,
  validateUUID, validateString,
  jsonResponse, errorResponse, safeLog,
} from "../_shared/validation.ts";

Deno.serve(createHandler(async (req) => {
  // Auth: staff only
  const auth = await verifyStaff(req);
  if (auth instanceof Response) return auth;

  const body = await parseBody<Record<string, unknown>>(req);
  if (body instanceof Response) return body;

  const userId = validateUUID(body.userId, "userId");
  const newPassword = validateString(body.newPassword, "newPassword", { required: false, minLen: 6, maxLen: 128 });
  const newEmail = validateString(body.newEmail, "newEmail", { required: false, maxLen: 255 });

  if (!newPassword && !newEmail) {
    return errorResponse("Informe nova senha ou novo e-mail", 400);
  }

  safeLog("RESET_USER_PASSWORD", { callerUserId: auth.userId, targetUserId: userId });

  const supabaseAdmin = getServiceClient();

  const updatePayload: Record<string, string> = {};
  if (newPassword) updatePayload.password = newPassword;
  if (newEmail) updatePayload.email = newEmail;

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, updatePayload);

  if (error) {
    return errorResponse(error.message, 400);
  }

  safeLog("PASSWORD_RESET_SUCCESS", { targetUserId: userId });
  return jsonResponse({ success: true });
}));

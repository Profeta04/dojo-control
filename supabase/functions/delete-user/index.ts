import {
  createHandler, verifyStaff, parseBody, getServiceClient,
  validateUUID,
  jsonResponse, errorResponse, safeLog,
} from "../_shared/validation.ts";

Deno.serve(createHandler(async (req) => {
  // Auth: staff only
  const auth = await verifyStaff(req);
  if (auth instanceof Response) return auth;

  const body = await parseBody<Record<string, unknown>>(req);
  if (body instanceof Response) return body;

  const userId = validateUUID(body.userId, "userId");

  // Prevent self-deletion
  if (!auth.isServiceRole && auth.userId === userId) {
    return errorResponse("Não é possível excluir sua própria conta", 400);
  }

  safeLog("DELETE_USER", { callerUserId: auth.userId, targetUserId: userId });

  const adminClient = getServiceClient();
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) {
    return errorResponse(error.message, 400);
  }

  safeLog("USER_DELETED", { targetUserId: userId });
  return jsonResponse({ success: true });
}));

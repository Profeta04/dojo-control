/**
 * Shared validation & security utilities for edge functions.
 * Centralizes auth, input sanitization, rate limiting, and error responses.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS Headers ────────────────────────────────────────────────────────────
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── JSON Response Helpers ───────────────────────────────────────────────────
export function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function errorResponse(message: string, status: number) {
  return jsonResponse({ error: message }, status);
}

// ─── Supabase Clients ────────────────────────────────────────────────────────
export function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export function getAnonClient(authHeader: string) {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
}

// ─── Auth Verification ──────────────────────────────────────────────────────
export interface AuthResult {
  userId: string;
  isServiceRole: boolean;
}

/**
 * Verify the caller. Returns userId or an error Response.
 * Supports service-role key bypass for internal/cron calls.
 */
export async function verifyAuth(req: Request): Promise<AuthResult | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return errorResponse("Unauthorized: missing token", 401);
  }

  const token = authHeader.replace("Bearer ", "");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Service role bypass for cron/internal
  if (token === serviceRoleKey) {
    return { userId: "service_role", isServiceRole: true };
  }

  // Verify user token via getClaims (faster than getUser)
  const anonClient = getAnonClient(authHeader);
  const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return errorResponse("Unauthorized: invalid token", 401);
  }

  return { userId: claimsData.claims.sub as string, isServiceRole: false };
}

/**
 * Verify caller is authenticated staff (admin/sensei/dono/super_admin).
 * Returns userId or error Response.
 */
export async function verifyStaff(req: Request): Promise<AuthResult | Response> {
  const authResult = await verifyAuth(req);
  if (authResult instanceof Response) return authResult;
  if (authResult.isServiceRole) return authResult;

  const adminClient = getServiceClient();
  const { data: isStaff } = await adminClient.rpc("is_staff", { _user_id: authResult.userId });
  if (!isStaff) {
    return errorResponse("Forbidden: staff only", 403);
  }
  return authResult;
}

/**
 * Verify caller has a specific role.
 */
export async function verifyRole(
  req: Request,
  allowedRoles: string[],
): Promise<AuthResult | Response> {
  const authResult = await verifyAuth(req);
  if (authResult instanceof Response) return authResult;
  if (authResult.isServiceRole) return authResult;

  const adminClient = getServiceClient();
  const { data: roles } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", authResult.userId);

  const userRoles = roles?.map((r: { role: string }) => r.role) || [];
  const isAuthorized = userRoles.some((r: string) => allowedRoles.includes(r));
  if (!isAuthorized) {
    return errorResponse("Forbidden: insufficient permissions", 403);
  }
  return authResult;
}

// ─── Input Validation ────────────────────────────────────────────────────────

/**
 * Safely parse JSON body, rejecting if too large.
 * Max body size: 100KB (default).
 */
export async function parseBody<T = Record<string, unknown>>(
  req: Request,
  maxSizeBytes = 102400,
): Promise<T | Response> {
  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      return errorResponse("Request body too large", 413);
    }
    const text = await req.text();
    if (text.length > maxSizeBytes) {
      return errorResponse("Request body too large", 413);
    }
    return JSON.parse(text) as T;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }
}

/**
 * Validate a string field: trim, check length, check pattern.
 */
export function validateString(
  value: unknown,
  fieldName: string,
  opts: { required?: boolean; minLen?: number; maxLen?: number; pattern?: RegExp } = {},
): string | null {
  const { required = true, minLen = 0, maxLen = 500, pattern } = opts;

  if (value === null || value === undefined || value === "") {
    if (required) throw new ValidationError(`${fieldName} é obrigatório`);
    return null;
  }
  if (typeof value !== "string") throw new ValidationError(`${fieldName} deve ser texto`);
  const trimmed = value.trim();
  if (required && trimmed.length === 0) throw new ValidationError(`${fieldName} é obrigatório`);
  if (trimmed.length < minLen) throw new ValidationError(`${fieldName} deve ter pelo menos ${minLen} caracteres`);
  if (trimmed.length > maxLen) throw new ValidationError(`${fieldName} deve ter no máximo ${maxLen} caracteres`);
  if (pattern && !pattern.test(trimmed)) throw new ValidationError(`${fieldName} inválido`);
  return trimmed;
}

/**
 * Validate email format.
 */
export function validateEmail(value: unknown, fieldName = "email"): string {
  const email = validateString(value, fieldName, { maxLen: 255 });
  if (!email) throw new ValidationError(`${fieldName} é obrigatório`);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) throw new ValidationError(`${fieldName} inválido`);
  return email.toLowerCase();
}

/**
 * Validate UUID format.
 */
export function validateUUID(value: unknown, fieldName = "id"): string {
  const id = validateString(value, fieldName, { maxLen: 36 });
  if (!id) throw new ValidationError(`${fieldName} é obrigatório`);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) throw new ValidationError(`${fieldName} deve ser um UUID válido`);
  return id;
}

/**
 * Validate a number.
 */
export function validateNumber(
  value: unknown,
  fieldName: string,
  opts: { required?: boolean; min?: number; max?: number } = {},
): number | null {
  const { required = true, min, max } = opts;
  if (value === null || value === undefined || value === "") {
    if (required) throw new ValidationError(`${fieldName} é obrigatório`);
    return null;
  }
  const num = Number(value);
  if (isNaN(num)) throw new ValidationError(`${fieldName} deve ser um número`);
  if (min !== undefined && num < min) throw new ValidationError(`${fieldName} deve ser no mínimo ${min}`);
  if (max !== undefined && num > max) throw new ValidationError(`${fieldName} deve ser no máximo ${max}`);
  return num;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// ─── Rate Limiting (in-memory, per-function instance) ────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/**
 * Simple in-memory rate limiter per IP. Resets every windowMs.
 * Returns error Response if rate limited, or null if ok.
 */
export function checkRateLimit(
  req: Request,
  maxRequests = 30,
  windowMs = 60000,
): Response | null {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";

  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return errorResponse("Too many requests", 429);
  }
  return null;
}

// ─── Safe Logging ────────────────────────────────────────────────────────────
/**
 * Log an action without leaking sensitive data.
 */
export function safeLog(action: string, meta: Record<string, unknown> = {}) {
  // Strip sensitive fields
  const safe = { ...meta };
  delete safe.password;
  delete safe.token;
  delete safe.secret;
  delete safe.newPassword;
  delete safe.email; // Don't log emails in production
  console.log(`[${action}]`, JSON.stringify(safe));
}

// ─── Edge Function Handler Wrapper ──────────────────────────────────────────
type HandlerFn = (req: Request) => Promise<Response>;

/**
 * Wraps an edge function handler with CORS, error handling, and rate limiting.
 */
export function createHandler(
  handler: HandlerFn,
  opts: { rateLimit?: boolean; maxRequests?: number } = {},
): (req: Request) => Promise<Response> {
  const { rateLimit = true, maxRequests = 30 } = opts;

  return async (req: Request) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (rateLimit) {
        const limited = checkRateLimit(req, maxRequests);
        if (limited) return limited;
      }

      return await handler(req);
    } catch (error) {
      if (error instanceof ValidationError) {
        return errorResponse(error.message, 400);
      }
      const msg = error instanceof Error ? error.message : "Internal server error";
      console.error(`[UNHANDLED_ERROR] ${msg}`);
      return errorResponse("Internal server error", 500);
    }
  };
}

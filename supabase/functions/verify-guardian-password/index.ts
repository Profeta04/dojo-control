import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory rate limiting store (resets when function restarts)
// For production, consider using Redis or a dedicated rate limiting service
const rateLimitStore = new Map<string, { attempts: number; resetTime: number }>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function getRateLimitKey(email: string, ip: string): string {
  // Use both email and IP for rate limiting
  return `${email.toLowerCase()}:${ip}`;
}

function checkRateLimit(key: string): { allowed: boolean; remainingAttempts: number; retryAfterMs?: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  // Clean up expired records
  if (record && now > record.resetTime) {
    rateLimitStore.delete(key);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    return { 
      allowed: false, 
      remainingAttempts: 0, 
      retryAfterMs: record.resetTime - now 
    };
  }

  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - record.attempts };
}

function recordAttempt(key: string, success: boolean): void {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (success) {
    // Clear rate limit on successful authentication
    rateLimitStore.delete(key);
    return;
  }

  if (!record || now > record.resetTime) {
    // First failed attempt or expired record
    rateLimitStore.set(key, {
      attempts: 1,
      resetTime: now + LOCKOUT_DURATION_MS,
    });
  } else {
    // Increment failed attempts
    record.attempts += 1;
    rateLimitStore.set(key, record);
  }
}

function getClientIP(req: Request): string {
  // Try to get real IP from headers (set by proxy/load balancer)
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIP = req.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  return "unknown";
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { guardianEmail, password } = await req.json();
    const clientIP = getClientIP(req);

    // Input validation
    if (!guardianEmail || typeof guardianEmail !== 'string' || 
        !password || typeof password !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: "Email e senha são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guardianEmail)) {
      return new Response(
        JSON.stringify({ success: false, error: "Formato de email inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check rate limit
    const rateLimitKey = getRateLimitKey(guardianEmail, clientIP);
    const rateLimit = checkRateLimit(rateLimitKey);

    if (!rateLimit.allowed) {
      const retryAfterSeconds = Math.ceil((rateLimit.retryAfterMs || 0) / 1000);
      const retryAfterMinutes = Math.ceil(retryAfterSeconds / 60);
      
      console.log(`Rate limit exceeded for ${guardianEmail} from ${clientIP}`);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Muitas tentativas. Tente novamente em ${retryAfterMinutes} minuto(s).`,
          retryAfter: retryAfterSeconds
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Retry-After": String(retryAfterSeconds)
          } 
        }
      );
    }

    console.log(`Verifying guardian password for: ${guardianEmail} (${rateLimit.remainingAttempts} attempts remaining)`);

    // Create a Supabase client with the service role key to verify credentials
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Try to sign in with the guardian credentials
    // This verifies the password without affecting the current session
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: guardianEmail,
      password: password,
    });

    if (error) {
      // Record failed attempt for rate limiting
      recordAttempt(rateLimitKey, false);
      
      const remainingAfterAttempt = checkRateLimit(rateLimitKey);
      console.log(`Guardian authentication failed for ${guardianEmail}. ${remainingAfterAttempt.remainingAttempts} attempts remaining.`);
      
      // Use generic error message to prevent user enumeration
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Senha incorreta",
          remainingAttempts: remainingAfterAttempt.remainingAttempts
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (data.user) {
      // Clear rate limit on success
      recordAttempt(rateLimitKey, true);
      
      console.log("Guardian password verified successfully");
      
      // Sign out the guardian session immediately (cleanup)
      await supabaseAdmin.auth.admin.signOut(data.session?.access_token ?? "");
      
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Erro ao verificar senha" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in verify-guardian-password:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

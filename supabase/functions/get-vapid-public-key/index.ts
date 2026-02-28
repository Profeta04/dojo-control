import { corsHeaders, jsonResponse } from "../_shared/validation.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  if (!publicKey) {
    return jsonResponse({ error: "VAPID key not configured" }, 500);
  }
  return jsonResponse({ publicKey });
});

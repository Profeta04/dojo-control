import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createHandler, verifyAuth, parseBody, getServiceClient,
  validateString, validateUUID,
  jsonResponse, errorResponse, corsHeaders,
} from "../_shared/validation.ts";

// ─── Helpers ────────────────────────────────────────────────────────────────

function b64uToBytes(b64u: string): Uint8Array {
  const b64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64.padEnd(b64.length + (4 - (b64.length % 4)) % 4, '=');
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

function bytesToB64u(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function buildVapidJWT(endpoint: string, subject: string, publicKeyB64u: string, privateKeyB64u: string): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const exp = Math.floor(Date.now() / 1000) + 43200;
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = { aud: audience, exp, sub: subject };
  const encode = (o: object) => bytesToB64u(new TextEncoder().encode(JSON.stringify(o)));
  const sigInput = `${encode(header)}.${encode(payload)}`;
  const pubBytes = b64uToBytes(publicKeyB64u);
  if (pubBytes.length !== 65 || pubBytes[0] !== 0x04) throw new Error(`Invalid public key length: ${pubBytes.length}`);
  const x = bytesToB64u(pubBytes.slice(1, 33));
  const y = bytesToB64u(pubBytes.slice(33, 65));
  const jwk = { kty: 'EC', crv: 'P-256', d: privateKeyB64u, x, y, ext: true, key_ops: ['sign'] };
  const privKey = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privKey, new TextEncoder().encode(sigInput));
  return `${sigInput}.${bytesToB64u(new Uint8Array(sig))}`;
}

async function encryptPayload(plaintext: string, p256dhB64u: string, authB64u: string): Promise<Uint8Array> {
  const clientPubKeyBytes = b64uToBytes(p256dhB64u);
  const authBytes = b64uToBytes(authB64u);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const serverKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const clientPubKey = await crypto.subtle.importKey('raw', clientPubKeyBytes, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const sharedSecretBits = await crypto.subtle.deriveBits({ name: 'ECDH', public: clientPubKey }, serverKeyPair.privateKey, 256);
  const sharedSecret = new Uint8Array(sharedSecretBits);
  const serverPubKeyBytes = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeyPair.publicKey));

  const prkKeyHmacKey = await crypto.subtle.importKey('raw', authBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prkKey = new Uint8Array(await crypto.subtle.sign('HMAC', prkKeyHmacKey, sharedSecret));
  const prkKeyForIkm = await crypto.subtle.importKey('raw', prkKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const ikm = new Uint8Array(await crypto.subtle.sign('HMAC', prkKeyForIkm,
    new Uint8Array([...new TextEncoder().encode('WebPush: info\0'), ...clientPubKeyBytes, ...serverPubKeyBytes, 1])));
  const saltHmacKey = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', saltHmacKey, ikm));
  const prkHmacKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const cekInfo = new Uint8Array([...new TextEncoder().encode('Content-Encoding: aes128gcm\0'), 1]);
  const cekFull = new Uint8Array(await crypto.subtle.sign('HMAC', prkHmacKey, cekInfo));
  const cek = cekFull.slice(0, 16);
  const nonceInfo = new Uint8Array([...new TextEncoder().encode('Content-Encoding: nonce\0'), 1]);
  const nonceFull = new Uint8Array(await crypto.subtle.sign('HMAC', prkHmacKey, nonceInfo));
  const nonce = nonceFull.slice(0, 12);

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const padded = new Uint8Array([...new TextEncoder().encode(plaintext), 2]);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, padded));

  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + serverPubKeyBytes.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs, false);
  header[20] = serverPubKeyBytes.length;
  header.set(serverPubKeyBytes, 21);

  const result = new Uint8Array(header.length + encrypted.length);
  result.set(header);
  result.set(encrypted, header.length);
  return result;
}

async function sendPush(
  sub: { endpoint: string; p256dh: string; auth_key: string },
  notification: { title: string; body: string; url?: string; icon?: string },
  vapidPublicKey: string, vapidPrivateKey: string, vapidSubject: string,
): Promise<{ success: boolean; expired?: boolean }> {
  try {
    const jwt = await buildVapidJWT(sub.endpoint, vapidSubject, vapidPublicKey, vapidPrivateKey);
    const encryptedBody = await encryptPayload(JSON.stringify(notification), sub.p256dh, sub.auth_key);
    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        TTL: '86400',
        Urgency: 'high',
      },
      body: encryptedBody,
    });
    await res.text(); // Consume body
    if (res.status === 410 || res.status === 404) return { success: false, expired: true };
    return { success: res.ok };
  } catch {
    return { success: false };
  }
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(createHandler(async (req) => {
  // Allow staff, service role, or anon key (from other edge functions)
  const auth = await verifyAuth(req);
  if (auth instanceof Response) return auth;

  // If not service role, verify staff
  if (!auth.isServiceRole) {
    const adminClient = getServiceClient();
    const { data: isStaff } = await adminClient.rpc("is_staff", { _user_id: auth.userId });

    // Also allow anon key calls from other edge functions
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    if (!isStaff && token !== anonKey) {
      return errorResponse("Forbidden", 403);
    }
  }

  const body = await parseBody<Record<string, unknown>>(req);
  if (body instanceof Response) return body;

  const title = validateString(body.title, "title", { maxLen: 200 });
  const bodyText = validateString(body.body, "body", { maxLen: 1000 });

  if (!title || !bodyText) return errorResponse("title and body are required", 400);

  let targetUserIds: string[] = [];
  if (body.userId && typeof body.userId === "string") targetUserIds = [body.userId];
  else if (Array.isArray(body.userIds)) targetUserIds = body.userIds.filter((id: unknown) => typeof id === "string");

  if (targetUserIds.length === 0) return errorResponse("userId or userIds required", 400);
  if (targetUserIds.length > 1000) return errorResponse("Too many recipients", 400);

  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
  const vapidSubject = Deno.env.get("VAPID_SUBJECT")!;

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return errorResponse("VAPID keys not configured", 500);
  }

  const supabaseAdmin = getServiceClient();
  const { data: subs } = await supabaseAdmin
    .from("push_subscriptions")
    .select("*")
    .in("user_id", targetUserIds);

  if (!subs || subs.length === 0) {
    return jsonResponse({ sent: 0, message: "No subscriptions found" });
  }

  const url = typeof body.url === "string" ? body.url.slice(0, 200) : "/";
  const icon = typeof body.icon === "string" ? body.icon.slice(0, 200) : "/favicon.png";

  const expiredEndpoints: string[] = [];
  let sent = 0;

  await Promise.all(subs.map(async (sub) => {
    const result = await sendPush(sub, { title, body: bodyText, url, icon }, vapidPublicKey, vapidPrivateKey, vapidSubject);
    if (result.expired) expiredEndpoints.push(sub.endpoint);
    else if (result.success) sent++;
  }));

  if (expiredEndpoints.length > 0) {
    await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", expiredEndpoints);
  }

  return jsonResponse({ sent, expired: expiredEndpoints.length });
}));

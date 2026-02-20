import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Manual VAPID implementation using Web Crypto API
// VAPID private keys are 32-byte raw EC scalars encoded as base64url.
// We must wrap them in a JWK to import via Web Crypto API.
async function importVapidPrivateKey(privateKeyBase64url: string, publicKeyBase64url: string): Promise<CryptoKey> {
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: privateKeyBase64url,
    x: publicKeyBase64url.slice(0, 43),  // approximate x (will be overridden below)
    y: publicKeyBase64url.slice(43),
    ext: true,
    key_ops: ['sign'],
  };
  // Derive x and y from the uncompressed public key bytes
  const pubBytes = base64urlToBytes(publicKeyBase64url);
  // pubBytes[0] == 0x04 (uncompressed), then 32 bytes x, 32 bytes y
  if (pubBytes.length === 65 && pubBytes[0] === 0x04) {
    jwk.x = bytesToBase64url(pubBytes.slice(1, 33));
    jwk.y = bytesToBase64url(pubBytes.slice(33, 65));
  }
  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

function base64urlToBytes(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const binary = atob(padded);
  return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
}

function bytesToBase64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function createVapidAuthHeader(endpoint: string, subject: string, publicKeyBase64url: string, privateKeyBase64url: string): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const expiration = Math.floor(Date.now() / 1000) + 12 * 3600;

  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = { aud: audience, exp: expiration, sub: subject };

  const encode = (obj: object) => bytesToBase64url(new TextEncoder().encode(JSON.stringify(obj)));
  const signingInput = `${encode(header)}.${encode(payload)}`;

  // Import VAPID private key as JWK (required by Deno's Web Crypto for EC keys)
  const privateKey = await importVapidPrivateKey(privateKeyBase64url, publicKeyBase64url);

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  const jwt = `${signingInput}.${bytesToBase64url(new Uint8Array(signature))}`;
  return `vapid t=${jwt}, k=${publicKeyBase64url}`;
}

async function encryptPayload(
  payload: string,
  p256dhBase64url: string,
  authBase64url: string
): Promise<{ encryptedBody: ArrayBuffer; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const serverKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);

  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    base64urlToBytes(p256dhBase64url),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const sharedSecret = await crypto.subtle.deriveBits({ name: 'ECDH', public: clientPublicKey }, serverKeyPair.privateKey, 256);

  const authBytes = base64urlToBytes(authBase64url);
  const serverPublicKeyBytes = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeyPair.publicKey));
  const clientPublicKeyBytes = base64urlToBytes(p256dhBase64url);

  // PRK_key
  const prkKeyHmacKey = await crypto.subtle.importKey('raw', authBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prkKeyInput = new Uint8Array([...new TextEncoder().encode('WebPush: info\0'), ...clientPublicKeyBytes, ...serverPublicKeyBytes]);
  const prkKey = await crypto.subtle.sign('HMAC', prkKeyHmacKey, prkKeyInput);

  // IKM
  const ikmHmacKey = await crypto.subtle.importKey('raw', new Uint8Array(sharedSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const ikm = await crypto.subtle.sign('HMAC', ikmHmacKey, new Uint8Array([...new Uint8Array(prkKey), 1]));

  // PRK
  const prkHmacKey = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = await crypto.subtle.sign('HMAC', prkHmacKey, new Uint8Array([...new Uint8Array(ikm), 1]));

  // CEK and nonce
  const cekHmacKey = await crypto.subtle.importKey('raw', new Uint8Array(prk), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const cekInput = new Uint8Array([...new TextEncoder().encode('Content-Encoding: aes128gcm\0'), 1]);
  const cekFull = await crypto.subtle.sign('HMAC', cekHmacKey, cekInput);
  const cek = new Uint8Array(cekFull).slice(0, 16);

  const nonceInput = new Uint8Array([...new TextEncoder().encode('Content-Encoding: nonce\0'), 1]);
  const nonceFull = await crypto.subtle.sign('HMAC', cekHmacKey, nonceInput);
  const nonce = new Uint8Array(nonceFull).slice(0, 12);

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const payloadBytes = new TextEncoder().encode(payload);
  const paddedPayload = new Uint8Array([...payloadBytes, 2]); // padding delimiter

  const encryptedContent = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, paddedPayload);

  // Build header: salt(16) + rs(4) + keylen(1) + serverPublicKey
  const rs = 4096;
  const header = new Uint8Array(21 + serverPublicKeyBytes.length);
  header.set(salt, 0);
  header[16] = (rs >> 24) & 0xff;
  header[17] = (rs >> 16) & 0xff;
  header[18] = (rs >> 8) & 0xff;
  header[19] = rs & 0xff;
  header[20] = serverPublicKeyBytes.length;
  header.set(serverPublicKeyBytes, 21);

  const encryptedBytes = new Uint8Array(encryptedContent);
  const body = new Uint8Array(header.length + encryptedBytes.length);
  body.set(header);
  body.set(encryptedBytes, header.length);

  return { encryptedBody: body.buffer, salt, serverPublicKey: serverPublicKeyBytes };
}

async function sendPushToSubscription(
  sub: { endpoint: string; p256dh: string; auth_key: string },
  notification: { title: string; body: string; url?: string; icon?: string },
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<{ success: boolean; expired?: boolean }> {
  try {
    const payload = JSON.stringify(notification);
    const { encryptedBody } = await encryptPayload(payload, sub.p256dh, sub.auth_key);
    const authHeader = await createVapidAuthHeader(sub.endpoint, vapidSubject, vapidPublicKey, vapidPrivateKey);

    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Content-Length': encryptedBody.byteLength.toString(),
      },
      body: encryptedBody,
    });

    if (res.status === 410 || res.status === 404) return { success: false, expired: true };
    return { success: res.ok };
  } catch (err) {
    console.error('Push send error:', err);
    return { success: false };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const vapidSubject = Deno.env.get('VAPID_SUBJECT')!;

    const { userId, userIds, title, body, url = '/', icon = '/favicon.png' } = await req.json();

    let targetUserIds: string[] = [];
    if (userId) targetUserIds = [userId];
    else if (userIds) targetUserIds = userIds;

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ error: 'userId or userIds required' }), { status: 400, headers: corsHeaders });
    }

    const { data: subs } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .in('user_id', targetUserIds);

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No subscriptions found' }), { headers: corsHeaders });
    }

    const expiredEndpoints: string[] = [];
    let sent = 0;

    await Promise.all(subs.map(async (sub) => {
      const result = await sendPushToSubscription(sub, { title, body, url, icon }, vapidPublicKey, vapidPrivateKey, vapidSubject);
      if (result.expired) expiredEndpoints.push(sub.endpoint);
      else if (result.success) sent++;
    }));

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      await supabaseAdmin.from('push_subscriptions').delete().in('endpoint', expiredEndpoints);
    }

    return new Response(JSON.stringify({ sent, expired: expiredEndpoints.length }), { headers: corsHeaders });
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});

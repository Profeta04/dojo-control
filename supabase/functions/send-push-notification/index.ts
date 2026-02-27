import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function b64uToBytes(b64u: string): Uint8Array {
  const b64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64.padEnd(b64.length + (4 - (b64.length % 4)) % 4, '=');
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

function bytesToB64u(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// ─── VAPID JWT ───────────────────────────────────────────────────────────────

async function buildVapidJWT(
  endpoint: string,
  subject: string,
  publicKeyB64u: string,
  privateKeyB64u: string,
): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const exp = Math.floor(Date.now() / 1000) + 43200; // 12h

  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = { aud: audience, exp, sub: subject };

  const encode = (o: object) =>
    bytesToB64u(new TextEncoder().encode(JSON.stringify(o)));

  const sigInput = `${encode(header)}.${encode(payload)}`;

  // Parse public key bytes (uncompressed: 0x04 + 32x + 32y)
  const pubBytes = b64uToBytes(publicKeyB64u);
  let x: string, y: string;
  if (pubBytes.length === 65 && pubBytes[0] === 0x04) {
    x = bytesToB64u(pubBytes.slice(1, 33));
    y = bytesToB64u(pubBytes.slice(33, 65));
  } else {
    throw new Error(`Invalid public key length: ${pubBytes.length}`);
  }

  const jwk = { kty: 'EC', crv: 'P-256', d: privateKeyB64u, x, y, ext: true, key_ops: ['sign'] };
  const privKey = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privKey,
    new TextEncoder().encode(sigInput),
  );

  return `${sigInput}.${bytesToB64u(new Uint8Array(sig))}`;
}

// ─── HKDF helper ─────────────────────────────────────────────────────────────

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const ikmKey = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits']);
  // HKDF-Extract: use salt as HMAC key
  const saltKey = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', saltKey, ikm));

  // HKDF-Expand
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const infoWithCounter = new Uint8Array([...info, 1]);
  const okm = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, infoWithCounter));
  return okm.slice(0, length);
}

// ─── RFC 8291 Payload Encryption ─────────────────────────────────────────────

async function encryptPayload(
  plaintext: string,
  p256dhB64u: string,
  authB64u: string,
): Promise<Uint8Array> {
  const clientPubKeyBytes = b64uToBytes(p256dhB64u);
  const authBytes = b64uToBytes(authB64u);
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Server ephemeral key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  );

  const clientPubKey = await crypto.subtle.importKey(
    'raw',
    clientPubKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );

  // ECDH shared secret
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPubKey },
    serverKeyPair.privateKey,
    256,
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);

  // Export server public key (uncompressed)
  const serverPubKeyBytes = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeyPair.publicKey),
  );

  // PRK_key via HKDF-Extract(auth, sharedSecret) with info = "WebPush: info\0" + clientPub + serverPub
  const webPushInfo = new Uint8Array([
    ...new TextEncoder().encode('WebPush: info\0'),
    ...clientPubKeyBytes,
    ...serverPubKeyBytes,
  ]);

  const saltKeyForPrk = await crypto.subtle.importKey('raw', authBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prkKeyRaw = new Uint8Array(await crypto.subtle.sign('HMAC', saltKeyForPrk, new Uint8Array([...new TextEncoder().encode('WebPush: info\0'), ...clientPubKeyBytes, ...serverPubKeyBytes])));
  // Actually use HKDF properly:
  // IKM = ECDH(serverPriv, clientPub)
  // PRK_key = HMAC-SHA-256(auth, IKM)
  const prkKeyHmacKey = await crypto.subtle.importKey('raw', authBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prkKey = new Uint8Array(await crypto.subtle.sign('HMAC', prkKeyHmacKey,
    new Uint8Array([...sharedSecret])));

  // IKM via HMAC-SHA-256(PRK_key, "WebPush: info\0" + clientPub + serverPub + 0x01)
  const prkKeyForIkm = await crypto.subtle.importKey('raw', prkKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const ikm = new Uint8Array(await crypto.subtle.sign('HMAC', prkKeyForIkm,
    new Uint8Array([...new TextEncoder().encode('WebPush: info\0'), ...clientPubKeyBytes, ...serverPubKeyBytes, 1])));

  // PRK = HMAC-SHA-256(salt, IKM)
  const saltHmacKey = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', saltHmacKey, ikm));

  // CEK = first 16 bytes of HMAC-SHA-256(PRK, "Content-Encoding: aes128gcm\0\x01")
  const prkHmacKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const cekInfo = new Uint8Array([...new TextEncoder().encode('Content-Encoding: aes128gcm\0'), 1]);
  const cekFull = new Uint8Array(await crypto.subtle.sign('HMAC', prkHmacKey, cekInfo));
  const cek = cekFull.slice(0, 16);

  // Nonce = first 12 bytes of HMAC-SHA-256(PRK, "Content-Encoding: nonce\0\x01")
  const nonceInfo = new Uint8Array([...new TextEncoder().encode('Content-Encoding: nonce\0'), 1]);
  const nonceFull = new Uint8Array(await crypto.subtle.sign('HMAC', prkHmacKey, nonceInfo));
  const nonce = nonceFull.slice(0, 12);

  // Encrypt with AES-128-GCM
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const plaintextBytes = new TextEncoder().encode(plaintext);
  // Add padding delimiter byte (0x02 = no padding)
  const padded = new Uint8Array([...plaintextBytes, 2]);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, padded),
  );

  // Build aes128gcm content-encoding header:
  // salt(16) + rs(4) + keylen(1) + serverPubKey(65)
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + serverPubKeyBytes.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs, false); // big-endian
  header[20] = serverPubKeyBytes.length;
  header.set(serverPubKeyBytes, 21);

  const result = new Uint8Array(header.length + encrypted.length);
  result.set(header);
  result.set(encrypted, header.length);

  return result;
}

// ─── Send single push ─────────────────────────────────────────────────────────

async function sendPush(
  sub: { endpoint: string; p256dh: string; auth_key: string },
  notification: { title: string; body: string; url?: string; icon?: string },
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string,
): Promise<{ success: boolean; expired?: boolean }> {
  try {
    const jwt = await buildVapidJWT(sub.endpoint, vapidSubject, vapidPublicKey, vapidPrivateKey);
    const encryptedBody = await encryptPayload(
      JSON.stringify(notification),
      sub.p256dh,
      sub.auth_key,
    );

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

    const respText = await res.text();
    console.log(`Push to ${sub.endpoint.slice(0, 60)}... → ${res.status} ${respText}`);

    if (res.status === 410 || res.status === 404) return { success: false, expired: true };
    return { success: res.ok };
  } catch (err) {
    console.error('sendPush error:', err);
    return { success: false };
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Validate caller is authenticated staff or internal service call
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify the caller is staff
    const token = authHeader.replace('Bearer ', '');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    // Allow service-role or anon key calls from other edge functions
    if (token !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') && token !== anonKey) {
      const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
      if (!caller) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: callerRoles } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', caller.id);
      const isStaff = callerRoles?.some((r: any) => ['admin', 'dono', 'super_admin', 'sensei'].includes(r.role));
      if (!isStaff) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const vapidSubject = Deno.env.get('VAPID_SUBJECT')!;

    const { userId, userIds, title, body, url = '/', icon = '/favicon.png' } = await req.json();

    let targetUserIds: string[] = [];
    if (userId) targetUserIds = [userId];
    else if (userIds) targetUserIds = userIds;

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ error: 'userId or userIds required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: subs } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .in('user_id', targetUserIds);

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No subscriptions found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const expiredEndpoints: string[] = [];
    let sent = 0;

    await Promise.all(subs.map(async (sub) => {
      const result = await sendPush(
        sub,
        { title, body, url, icon },
        vapidPublicKey,
        vapidPrivateKey,
        vapidSubject,
      );
      if (result.expired) expiredEndpoints.push(sub.endpoint);
      else if (result.success) sent++;
    }));

    if (expiredEndpoints.length > 0) {
      await supabaseAdmin.from('push_subscriptions').delete().in('endpoint', expiredEndpoints);
    }

    return new Response(
      JSON.stringify({ sent, expired: expiredEndpoints.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

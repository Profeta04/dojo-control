import {
  createHandler,
  verifyAuth,
  parseBody,
  getServiceClient,
  validateString,
  jsonResponse,
  errorResponse,
  safeLog,
} from "../_shared/validation.ts";
import { buildPushPayload } from "npm:@block65/webcrypto-web-push@1.0.2";

type SubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth_key: string;
};

type NotificationPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  type?: string;
  image?: string;
};

const TYPE_ICONS: Record<string, string> = {
  payment: "/icons/payment.png",
  warning: "/icons/warning.png",
  training: "/icons/training.png",
  announcement: "/icons/info.png",
  info: "/icons/info.png",
  level_up: "/icons/info.png",
};

async function sendPush(
  sub: SubscriptionRow,
  notification: NotificationPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string,
): Promise<{ success: boolean; expired?: boolean; status?: number }> {
  try {
    const payload = await buildPushPayload(
      {
        data: JSON.stringify(notification),
        options: {
          ttl: 86400,
        },
      },
      {
        endpoint: sub.endpoint,
        expirationTime: null,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth_key,
        },
      },
      {
        subject: vapidSubject,
        publicKey: vapidPublicKey,
        privateKey: vapidPrivateKey,
      },
    );

    const res = await fetch(sub.endpoint, payload);
    await res.text();

    if (res.status === 404 || res.status === 410) {
      return { success: false, expired: true, status: res.status };
    }

    return { success: res.ok, status: res.status };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown_error";
    safeLog("PUSH_SEND_ERROR", { endpoint: sub.endpoint.slice(0, 80), error: msg });
    return { success: false };
  }
}

Deno.serve(
  createHandler(async (req) => {
    const auth = await verifyAuth(req);
    if (auth instanceof Response) return auth;

    if (!auth.isServiceRole) {
      const adminClient = getServiceClient();
      const { data: isStaff } = await adminClient.rpc("is_staff", { _user_id: auth.userId });
      if (!isStaff) return errorResponse("Forbidden", 403);
    }

    const body = await parseBody<Record<string, unknown>>(req);
    if (body instanceof Response) return body;

    const title = validateString(body.title, "title", { maxLen: 200 });
    const bodyText = validateString(body.body, "body", { maxLen: 1000 });

    if (!title || !bodyText) return errorResponse("title and body are required", 400);

    let targetUserIds: string[] = [];
    if (body.userId && typeof body.userId === "string") targetUserIds = [body.userId];
    else if (Array.isArray(body.userIds)) {
      targetUserIds = body.userIds.filter((id: unknown) => typeof id === "string") as string[];
    }

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
      .select("endpoint,p256dh,auth_key")
      .in("user_id", targetUserIds);

    if (!subs || subs.length === 0) {
      return jsonResponse({ sent: 0, message: "No subscriptions found" });
    }

    const url = typeof body.url === "string" ? body.url.slice(0, 200) : "/";
    const notifType = typeof body.type === "string" ? body.type.slice(0, 50) : "info";
    const icon = typeof body.icon === "string" ? body.icon.slice(0, 200) : (TYPE_ICONS[notifType] || "/favicon.png");
    const image = typeof body.image === "string" ? body.image.slice(0, 500) : undefined;

    const expiredEndpoints: string[] = [];
    let sent = 0;
    let failed = 0;

    await Promise.all(
      (subs as SubscriptionRow[]).map(async (sub) => {
        const result = await sendPush(
          sub,
          { title, body: bodyText, url, icon, type: notifType, ...(image ? { image } : {}) },
          vapidPublicKey,
          vapidPrivateKey,
          vapidSubject,
        );

        if (result.expired) expiredEndpoints.push(sub.endpoint);
        if (result.success) sent++;
        else failed++;
      }),
    );

    if (expiredEndpoints.length > 0) {
      await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", expiredEndpoints);
    }

    safeLog("PUSH_SEND_SUMMARY", {
      recipients: targetUserIds.length,
      subscriptions: subs.length,
      sent,
      failed,
      expired: expiredEndpoints.length,
    });

    return jsonResponse({ sent, failed, expired: expiredEndpoints.length });
  }),
);

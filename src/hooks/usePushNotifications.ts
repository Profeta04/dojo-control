import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

let cachedVapidKey = "";

async function getVapidPublicKey(): Promise<string> {
  if (cachedVapidKey) return cachedVapidKey;
  try {
    const { data, error } = await supabase.functions.invoke("get-vapid-public-key");
    if (!error && data?.publicKey) {
      cachedVapidKey = data.publicKey;
      return cachedVapidKey;
    }
  } catch {/* silent */}
  return "";
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "Notification" in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      navigator.serviceWorker.getRegistration("/sw.js").then((reg) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pm = reg && (reg as any).pushManager;
        if (pm) {
          pm.getSubscription().then((sub: PushSubscription | null) => {
            setIsSubscribed(!!sub);
          });
        }
      });
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!user || !isSupported) return false;
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setIsLoading(false);
        return false;
      }

      const vapidPublicKey = await getVapidPublicKey();
      if (!vapidPublicKey) {
        console.error("VAPID_PUBLIC_KEY not configured");
        setIsLoading(false);
        return false;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pm = (registration as any).pushManager;
      if (!pm) {
        console.error("PushManager not supported");
        setIsLoading(false);
        return false;
      }

      // Unsubscribe from any existing (possibly stale) subscription first
      const existingSub = await pm.getSubscription();
      if (existingSub) await existingSub.unsubscribe();

      const subscription = await pm.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const subJSON = subscription.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: subJSON.endpoint,
          p256dh: subJSON.keys.p256dh,
          auth_key: subJSON.keys.auth,
        },
        { onConflict: "user_id,endpoint" }
      );

      if (error) throw error;

      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.error("Push subscription error:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pm = registration && (registration as any).pushManager;
      if (pm) {
        const subscription = await pm.getSubscription();
        if (subscription) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from("push_subscriptions")
            .delete()
            .eq("user_id", user.id)
            .eq("endpoint", subscription.endpoint);
          await subscription.unsubscribe();
        }
      }
      setIsSubscribed(false);
    } catch (error) {
      console.error("Unsubscribe error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return { permission, isSubscribed, isSupported, isLoading, subscribe, unsubscribe };
}

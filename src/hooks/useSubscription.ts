import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDojoContext } from "@/hooks/useDojoContext";
import { SubscriptionTierKey } from "@/lib/subscriptionTiers";

interface SubscriptionState {
  subscribed: boolean;
  tier: SubscriptionTierKey | null;
  subscriptionEnd: string | null;
  status: string | null;
  loading: boolean;
}

export function useSubscription() {
  const { user } = useAuth();
  const { currentDojoId } = useDojoContext();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    tier: null,
    subscriptionEnd: null,
    status: null,
    loading: true,
  });

  const checkSubscription = useCallback(async () => {
    if (!user || !currentDojoId) {
      setState({ subscribed: false, tier: null, subscriptionEnd: null, status: null, loading: false });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("dojo_subscriptions")
        .select("*")
        .eq("dojo_id", currentDojoId)
        .eq("status", "ativo")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setState({
          subscribed: true,
          tier: data.tier as SubscriptionTierKey,
          subscriptionEnd: data.expires_at,
          status: data.status,
          loading: false,
        });
      } else {
        // Check for pending subscriptions
        const { data: pending } = await supabase
          .from("dojo_subscriptions")
          .select("*")
          .eq("dojo_id", currentDojoId)
          .eq("status", "pendente")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        setState({
          subscribed: false,
          tier: null,
          subscriptionEnd: null,
          status: pending ? "pendente" : null,
          loading: false,
        });
      }
    } catch (err) {
      console.error("Error checking subscription:", err);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [user, currentDojoId]);

  useEffect(() => {
    checkSubscription();
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  return { ...state, refresh: checkSubscription };
}

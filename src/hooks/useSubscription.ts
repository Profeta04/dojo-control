import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getTierByProductId, SubscriptionTierKey } from "@/lib/subscriptionTiers";

interface SubscriptionState {
  subscribed: boolean;
  tier: SubscriptionTierKey | null;
  subscriptionEnd: string | null;
  loading: boolean;
}

export function useSubscription() {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    tier: null,
    subscriptionEnd: null,
    loading: true,
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setState({ subscribed: false, tier: null, subscriptionEnd: null, loading: false });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;

      const tier = data.product_id ? getTierByProductId(data.product_id) : null;
      setState({
        subscribed: data.subscribed ?? false,
        tier,
        subscriptionEnd: data.subscription_end ?? null,
        loading: false,
      });
    } catch (err) {
      console.error("Error checking subscription:", err);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [user]);

  useEffect(() => {
    checkSubscription();
    // Auto-refresh every 60 seconds
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  return { ...state, refresh: checkSubscription };
}

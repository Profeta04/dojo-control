import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDojoContext } from "@/hooks/useDojoContext";
import { SubscriptionTierKey } from "@/lib/subscriptionTiers";
import { useCallback } from "react";

interface SubscriptionState {
  subscribed: boolean;
  tier: SubscriptionTierKey | "teste" | null;
  subscriptionEnd: string | null;
  status: string | null;
  loading: boolean;
}

export function useSubscription() {
  const { user } = useAuth();
  const { currentDojoId } = useDojoContext();

  const { data: state, isLoading } = useQuery({
    queryKey: ["dojo-subscription", currentDojoId],
    queryFn: async (): Promise<Omit<SubscriptionState, "loading">> => {
      if (!user || !currentDojoId) {
        return { subscribed: false, tier: null, subscriptionEnd: null, status: null };
      }

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
        // Check if expired
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          return {
            subscribed: false,
            tier: null,
            subscriptionEnd: data.expires_at,
            status: "expirado",
          };
        }
        return {
          subscribed: true,
          tier: data.tier as SubscriptionTierKey | "teste",
          subscriptionEnd: data.expires_at,
          status: data.status,
        };
      }

      // Check for pending subscriptions
      const { data: pending } = await supabase
        .from("dojo_subscriptions")
        .select("status")
        .eq("dojo_id", currentDojoId)
        .eq("status", "pendente")
        .limit(1)
        .maybeSingle();

      return {
        subscribed: false,
        tier: null,
        subscriptionEnd: null,
        status: pending ? "pendente" : null,
      };
    },
    enabled: !!user && !!currentDojoId,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const queryClient = useQueryClient();
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["dojo-subscription", currentDojoId] });
  }, [queryClient, currentDojoId]);

  return {
    subscribed: state?.subscribed ?? false,
    tier: state?.tier ?? null,
    subscriptionEnd: state?.subscriptionEnd ?? null,
    status: state?.status ?? null,
    loading: isLoading,
    refresh,
  };
}

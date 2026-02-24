import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface OnboardingData {
  welcome_seen: boolean;
  tabs_seen: string[];
}

export function useOnboarding() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: onboarding, isLoading } = useQuery({
    queryKey: ["user-onboarding", user?.id],
    queryFn: async (): Promise<OnboardingData> => {
      if (!user) return { welcome_seen: false, tabs_seen: [] };
      const { data } = await supabase
        .from("user_onboarding")
        .select("welcome_seen, tabs_seen")
        .eq("user_id", user.id)
        .single();
      if (!data) return { welcome_seen: false, tabs_seen: [] };
      return {
        welcome_seen: data.welcome_seen,
        tabs_seen: (data.tabs_seen as string[]) || [],
      };
    },
    enabled: !!user,
  });

  const markWelcomeSeen = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase
        .from("user_onboarding")
        .upsert(
          { user_id: user.id, welcome_seen: true, tabs_seen: onboarding?.tabs_seen || [] },
          { onConflict: "user_id" }
        );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user-onboarding"] }),
  });

  const markTabSeen = useMutation({
    mutationFn: async (tabId: string) => {
      if (!user) return;
      const currentTabs = onboarding?.tabs_seen || [];
      if (currentTabs.includes(tabId)) return;
      const newTabs = [...currentTabs, tabId];
      await supabase
        .from("user_onboarding")
        .upsert(
          { user_id: user.id, welcome_seen: onboarding?.welcome_seen ?? true, tabs_seen: newTabs },
          { onConflict: "user_id" }
        );
    },
    onMutate: async (tabId: string) => {
      // Optimistic update to prevent dialog re-triggering
      await queryClient.cancelQueries({ queryKey: ["user-onboarding", user?.id] });
      const previous = queryClient.getQueryData<OnboardingData>(["user-onboarding", user?.id]);
      queryClient.setQueryData<OnboardingData>(["user-onboarding", user?.id], (old) => ({
        welcome_seen: old?.welcome_seen ?? true,
        tabs_seen: [...(old?.tabs_seen || []), tabId],
      }));
      return { previous };
    },
    onError: (_err, _tabId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["user-onboarding", user?.id], context.previous);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["user-onboarding"] }),
  });

  const tabsSeen = onboarding?.tabs_seen ?? [];

  const hasSeenTab = useCallback(
    (tabId: string) => tabsSeen.includes(tabId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tabsSeen.join(",")]
  );

  return {
    welcomeSeen: onboarding?.welcome_seen ?? false,
    tabsSeen,
    isLoading,
    markWelcomeSeen: () => markWelcomeSeen.mutate(),
    markTabSeen: (tabId: string) => markTabSeen.mutate(tabId),
    hasSeenTab,
  };
}

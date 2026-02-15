import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect } from "react";
import { calculateLevel, getStreakMultiplier } from "./useXP";

export interface Season {
  id: string;
  name: string;
  slug: string;
  theme: string;
  year: number;
  quarter: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  xp_multiplier: number;
  color_primary: string;
  color_accent: string;
  icon: string;
  title_reward: string | null;
  border_style: string | null;
}

export interface SeasonXP {
  id: string;
  user_id: string;
  season_id: string;
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

export interface SeasonReward {
  id: string;
  user_id: string;
  season_id: string;
  reward_type: string;
  reward_value: string;
  final_rank: number | null;
  final_xp: number | null;
  earned_at: string;
}

const THEME_GRADIENTS: Record<string, string> = {
  verao: "from-orange-500 via-amber-400 to-yellow-300",
  outono: "from-amber-700 via-orange-600 to-yellow-600",
  inverno: "from-blue-500 via-cyan-400 to-blue-300",
  primavera: "from-green-500 via-emerald-400 to-lime-300",
};

const THEME_BG: Record<string, string> = {
  verao: "bg-gradient-to-r from-orange-500/10 to-amber-500/10",
  outono: "bg-gradient-to-r from-amber-700/10 to-orange-600/10",
  inverno: "bg-gradient-to-r from-blue-500/10 to-cyan-400/10",
  primavera: "bg-gradient-to-r from-green-500/10 to-emerald-400/10",
};

export function useSeasons(targetUserId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = targetUserId || user?.id;

  // Fetch active season
  const { data: activeSeason, isLoading: seasonLoading } = useQuery({
    queryKey: ["active-season"],
    queryFn: async (): Promise<Season | null> => {
      const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data as Season | null;
    },
  });

  // Fetch all seasons
  const { data: allSeasons = [] } = useQuery({
    queryKey: ["all-seasons"],
    queryFn: async (): Promise<Season[]> => {
      const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .order("year", { ascending: true })
        .order("quarter", { ascending: true });

      if (error) throw error;
      return data as Season[];
    },
  });

  // Fetch user's season XP
  const { data: seasonXP, isLoading: xpLoading } = useQuery({
    queryKey: ["season-xp", userId, activeSeason?.id],
    queryFn: async (): Promise<SeasonXP | null> => {
      if (!userId || !activeSeason) return null;

      const { data, error } = await supabase
        .from("season_xp")
        .select("*")
        .eq("user_id", userId)
        .eq("season_id", activeSeason.id)
        .maybeSingle();

      if (error) throw error;
      return data as SeasonXP | null;
    },
    enabled: !!userId && !!activeSeason,
  });

  // Fetch user's season rewards
  const { data: myRewards = [] } = useQuery({
    queryKey: ["season-rewards", userId],
    queryFn: async (): Promise<SeasonReward[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("season_rewards")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      return data as SeasonReward[];
    },
    enabled: !!userId,
  });

  // Realtime subscription for season XP
  useEffect(() => {
    if (!userId || !activeSeason) return;

    const channel = supabase
      .channel(`season-xp-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "season_xp",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["season-xp", userId, activeSeason.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, activeSeason, queryClient]);

  // Grant season XP mutation
  const grantSeasonXP = useMutation({
    mutationFn: async ({ baseXP }: { baseXP: number }) => {
      if (!userId || !activeSeason) throw new Error("No user or season");

      const { data: current } = await supabase
        .from("season_xp")
        .select("*")
        .eq("user_id", userId)
        .eq("season_id", activeSeason.id)
        .maybeSingle();

      const today = new Date().toISOString().split("T")[0];
      let currentStreak = current?.current_streak || 0;
      let longestStreak = current?.longest_streak || 0;
      const lastActivity = current?.last_activity_date;

      if (lastActivity) {
        const diff = Math.floor(
          (new Date(today).getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diff === 1) currentStreak += 1;
        else if (diff > 1) currentStreak = 1;
      } else {
        currentStreak = 1;
      }

      if (currentStreak > longestStreak) longestStreak = currentStreak;

      const multiplier = getStreakMultiplier(currentStreak);
      const seasonMultiplier = Number(activeSeason.xp_multiplier) || 1;
      const finalXP = Math.round(baseXP * multiplier * seasonMultiplier);
      const newTotal = (current?.total_xp || 0) + finalXP;
      const newLevel = calculateLevel(newTotal);

      if (current) {
        await supabase
          .from("season_xp")
          .update({
            total_xp: newTotal,
            level: newLevel,
            current_streak: currentStreak,
            longest_streak: longestStreak,
            last_activity_date: today,
          })
          .eq("user_id", userId)
          .eq("season_id", activeSeason.id);
      } else {
        await supabase.from("season_xp").insert({
          user_id: userId,
          season_id: activeSeason.id,
          total_xp: finalXP,
          level: calculateLevel(finalXP),
          current_streak: 1,
          longest_streak: 1,
          last_activity_date: today,
        });
      }

      return { xpGranted: finalXP, newTotal, newLevel };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["season-xp", userId, activeSeason?.id] });
    },
  });

  // Computed values
  const seasonLevel = seasonXP?.level || 1;
  const seasonTotalXp = seasonXP?.total_xp || 0;
  const gradient = activeSeason ? THEME_GRADIENTS[activeSeason.theme] || THEME_GRADIENTS.verao : "";
  const bgClass = activeSeason ? THEME_BG[activeSeason.theme] || THEME_BG.verao : "";

  // Days remaining in season
  const daysRemaining = activeSeason
    ? Math.max(0, Math.ceil((new Date(activeSeason.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Active title from rewards
  const activeTitle = myRewards.find(
    (r) => r.reward_type === "title"
  )?.reward_value || null;

  // Active border from rewards
  const activeBorder = myRewards.find(
    (r) => r.reward_type === "border"
  )?.reward_value || null;

  return {
    activeSeason,
    allSeasons,
    seasonXP,
    myRewards,
    isLoading: seasonLoading || xpLoading,
    grantSeasonXP,
    // Computed
    seasonLevel,
    seasonTotalXp,
    gradient,
    bgClass,
    daysRemaining,
    activeTitle,
    activeBorder,
  };
}

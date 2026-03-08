import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect } from "react";

// XP config: level thresholds & streak multipliers
const XP_PER_LEVEL = 100; // XP needed per level (scales: level * XP_PER_LEVEL)
const STREAK_MULTIPLIERS = [
  { days: 30, multiplier: 2.0 },
  { days: 14, multiplier: 1.75 },
  { days: 7, multiplier: 1.5 },
  { days: 3, multiplier: 1.25 },
] as const;

export function calculateLevel(totalXp: number): number {
  // Level formula: sum of 1..L levels = L*(L+1)/2 * XP_PER_LEVEL
  // Simplified: each level costs level * XP_PER_LEVEL
  let level = 1;
  let xpNeeded = 0;
  while (xpNeeded + level * XP_PER_LEVEL <= totalXp) {
    xpNeeded += level * XP_PER_LEVEL;
    level++;
  }
  return level;
}

export function xpForNextLevel(level: number): number {
  return level * XP_PER_LEVEL;
}

export function xpProgressInLevel(totalXp: number, level: number): number {
  let consumed = 0;
  for (let l = 1; l < level; l++) {
    consumed += l * XP_PER_LEVEL;
  }
  return totalXp - consumed;
}

export function getStreakMultiplier(streakDays: number): number {
  for (const tier of STREAK_MULTIPLIERS) {
    if (streakDays >= tier.days) return tier.multiplier;
  }
  return 1.0;
}

export interface StudentXP {
  id: string;
  user_id: string;
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

export function useXP(targetUserId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = targetUserId || user?.id;

  const { data: xpData, isLoading } = useQuery({
    queryKey: ["student-xp", userId],
    queryFn: async (): Promise<StudentXP> => {
      if (!userId) throw new Error("No user");

      const { data, error } = await supabase
        .from("student_xp")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      // If no record, create one
      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from("student_xp")
          .insert({ user_id: userId })
          .select()
          .single();

        if (insertError) throw insertError;
        return newData as StudentXP;
      }

      return data as StudentXP;
    },
    enabled: !!userId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`xp-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_xp",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["student-xp", userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  // Grant XP mutation — atomic server-side via RPC
  const grantXP = useMutation({
    mutationFn: async ({
      baseXP,
      reason,
    }: {
      baseXP: number;
      reason: string;
    }) => {
      if (!userId) throw new Error("No user");

      const { data, error } = await supabase.rpc("grant_xp", {
        _user_id: userId,
        _base_xp: baseXP,
      });

      if (error) throw error;

      const result = data as {
        xpGranted: number;
        multiplier: number;
        newTotal: number;
        newLevel: number;
        leveledUp: boolean;
        currentStreak: number;
      };

      return {
        xpGranted: result.xpGranted,
        multiplier: result.multiplier,
        newTotal: result.newTotal,
        newLevel: result.newLevel,
        leveledUp: result.leveledUp,
        reason,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-xp", userId] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });

  const level = xpData?.level || 1;
  const totalXp = xpData?.total_xp || 0;
  const currentProgress = xpProgressInLevel(totalXp, level);
  const neededForNext = xpForNextLevel(level);
  const progressPercent = Math.min((currentProgress / neededForNext) * 100, 100);

  // Compute effective streak: if last_activity_date is stale (>1 day ago), streak is effectively 0
  const effectiveStreak = (() => {
    if (!xpData?.last_activity_date || !xpData?.current_streak) return 0;
    const lastDate = new Date(xpData.last_activity_date);
    const today = new Date();
    // Reset time portions for comparison
    lastDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) return xpData.current_streak;
    return 0; // Streak broken
  })();

  return {
    xpData,
    isLoading,
    grantXP,
    // Computed values
    level,
    totalXp,
    currentProgress,
    neededForNext,
    progressPercent,
    currentStreak: effectiveStreak,
    longestStreak: xpData?.longest_streak || 0,
    streakMultiplier: getStreakMultiplier(effectiveStreak),
  };
}

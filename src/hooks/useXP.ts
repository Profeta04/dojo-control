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

  // Grant XP mutation (called after task completion/approval)
  const grantXP = useMutation({
    mutationFn: async ({
      baseXP,
      reason,
    }: {
      baseXP: number;
      reason: string;
    }) => {
      if (!userId) throw new Error("No user");

      // Get current XP data
      const { data: current, error: fetchError } = await supabase
        .from("student_xp")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const today = new Date().toISOString().split("T")[0];
      let currentStreak = current?.current_streak || 0;
      let longestStreak = current?.longest_streak || 0;
      const lastActivity = current?.last_activity_date;

      // Calculate streak
      if (lastActivity) {
        const lastDate = new Date(lastActivity);
        const todayDate = new Date(today);
        const diffDays = Math.floor(
          (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === 1) {
          // Consecutive day
          currentStreak += 1;
        } else if (diffDays === 0) {
          // Same day, keep streak
        } else {
          // Streak broken
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }

      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }

      // Apply streak multiplier
      const multiplier = getStreakMultiplier(currentStreak);
      const finalXP = Math.round(baseXP * multiplier);

      const newTotalXP = (current?.total_xp || 0) + finalXP;
      const newLevel = calculateLevel(newTotalXP);

      if (current) {
        const { error } = await supabase
          .from("student_xp")
          .update({
            total_xp: newTotalXP,
            level: newLevel,
            current_streak: currentStreak,
            longest_streak: longestStreak,
            last_activity_date: today,
          })
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("student_xp").insert({
          user_id: userId,
          total_xp: finalXP,
          level: calculateLevel(finalXP),
          current_streak: 1,
          longest_streak: 1,
          last_activity_date: today,
        });

        if (error) throw error;
      }

      return {
        xpGranted: finalXP,
        multiplier,
        newTotal: newTotalXP,
        newLevel,
        leveledUp: newLevel > (current ? calculateLevel(current.total_xp) : 0),
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
    currentStreak: xpData?.current_streak || 0,
    longestStreak: xpData?.longest_streak || 0,
    streakMultiplier: getStreakMultiplier(xpData?.current_streak || 0),
  };
}

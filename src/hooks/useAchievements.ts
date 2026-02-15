import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect, useCallback } from "react";

export interface Achievement {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  category: string;
  criteria_type: string;
  criteria_value: number;
  xp_reward: number;
  is_annual: boolean;
  annual_year: number | null;
  rarity: string;
}

export interface StudentAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: Achievement;
}

const RARITY_ORDER: Record<string, number> = {
  legendary: 4,
  epic: 3,
  rare: 2,
  common: 1,
};

export function useAchievements(targetUserId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = targetUserId || user?.id;

  // Fetch all achievement definitions
  const { data: allAchievements = [] } = useQuery({
    queryKey: ["achievements-definitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .order("criteria_value", { ascending: true });

      if (error) throw error;
      return data as Achievement[];
    },
  });

  // Fetch user's unlocked achievements
  const { data: unlockedAchievements = [], isLoading } = useQuery({
    queryKey: ["student-achievements", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("student_achievements")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;

      // Enrich with achievement details
      const achievementMap = new Map<string, Achievement>();
      if (allAchievements.length > 0) {
        allAchievements.forEach((a) => achievementMap.set(a.id, a));
      } else {
        // Fetch if not loaded yet
        const { data: achData } = await supabase
          .from("achievements")
          .select("*");
        achData?.forEach((a) => achievementMap.set(a.id, a as Achievement));
      }

      return (data as StudentAchievement[]).map((sa) => ({
        ...sa,
        achievement: achievementMap.get(sa.achievement_id),
      }));
    },
    enabled: !!userId,
  });

  // Realtime for new achievements
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`achievements-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "student_achievements",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["student-achievements", userId],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  // Check and unlock achievements based on current stats
  const checkAndUnlock = useMutation({
    mutationFn: async (stats: {
      tasksCompleted: number;
      currentStreak: number;
      totalXp: number;
    }) => {
      if (!userId) throw new Error("No user");

      const unlockedIds = new Set(
        unlockedAchievements.map((ua) => ua.achievement_id)
      );

      const newlyUnlocked: Achievement[] = [];

      for (const achievement of allAchievements) {
        if (unlockedIds.has(achievement.id)) continue;
        if (achievement.is_annual) continue; // Annual handled separately

        let qualifies = false;

        switch (achievement.criteria_type) {
          case "tasks_completed":
            qualifies = stats.tasksCompleted >= achievement.criteria_value;
            break;
          case "streak_days":
            qualifies = stats.currentStreak >= achievement.criteria_value;
            break;
          case "xp_total":
            qualifies = stats.totalXp >= achievement.criteria_value;
            break;
        }

        if (qualifies) {
          const { error } = await supabase
            .from("student_achievements")
            .insert({
              user_id: userId,
              achievement_id: achievement.id,
            });

          if (!error) {
            newlyUnlocked.push(achievement);
            // Create notification for the user
            await supabase.from("notifications").insert({
              user_id: userId,
              title: `🏅 Conquista desbloqueada!`,
              message: `Você desbloqueou "${achievement.name}"! +${achievement.xp_reward} XP`,
              type: "achievement",
              related_id: achievement.id,
            });
          }
        }
      }

      return newlyUnlocked;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["student-achievements", userId],
      });
    },
  });

  // Unlock annual achievements (called during yearly reset)
  const unlockAnnual = useCallback(
    async (achievementId: string) => {
      if (!userId) return;

      await supabase.from("student_achievements").insert({
        user_id: userId,
        achievement_id: achievementId,
      });

      queryClient.invalidateQueries({
        queryKey: ["student-achievements", userId],
      });
    },
    [userId, queryClient]
  );

  // Sorted by rarity (legendary first)
  const sortedUnlocked = [...unlockedAchievements].sort((a, b) => {
    const rarityA = RARITY_ORDER[a.achievement?.rarity || "common"] || 0;
    const rarityB = RARITY_ORDER[b.achievement?.rarity || "common"] || 0;
    return rarityB - rarityA;
  });

  const unlockedCount = unlockedAchievements.length;
  const totalCount = allAchievements.filter((a) => !a.is_annual).length;

  return {
    allAchievements,
    unlockedAchievements: sortedUnlocked,
    isLoading,
    checkAndUnlock,
    unlockAnnual,
    unlockedCount,
    totalCount,
    progressPercent:
      totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0,
  };
}

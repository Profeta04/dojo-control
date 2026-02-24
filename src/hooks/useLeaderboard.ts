import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useDojoContext } from "./useDojoContext";
import { useEffect } from "react";

export interface LeaderboardEntry {
  user_id: string;
  name: string;
  avatar_url: string | null;
  belt_grade: string | null;
  total_xp: number;
  level: number;
  current_streak: number;
  rank: number;
  achievement_count: number;
  class_ids: string[];
  martial_arts: string[];
}

export interface LeaderboardHistoryEntry {
  id: string;
  user_id: string;
  dojo_id: string;
  year: number;
  final_xp: number;
  final_rank: number;
  name?: string;
}

export interface LeaderboardClassInfo {
  id: string;
  name: string;
  martial_art: string;
}

export function useLeaderboard() {
  const { user } = useAuth();
  const { currentDojoId } = useDojoContext();

  // Fallback: get dojo from user profile if context not set
  const { data: profileDojoId } = useQuery({
    queryKey: ["profile-dojo-id", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("dojo_id")
        .eq("user_id", user.id)
        .single();
      return data?.dojo_id || null;
    },
    enabled: !!user && !currentDojoId,
  });

  const effectiveDojoId = currentDojoId || profileDojoId;

  // Fetch classes for filter options
  const { data: dojoClasses = [] } = useQuery({
    queryKey: ["leaderboard-classes", effectiveDojoId],
    queryFn: async (): Promise<LeaderboardClassInfo[]> => {
      if (!effectiveDojoId) return [];
      const { data } = await supabase
        .from("classes")
        .select("id, name, martial_art")
        .eq("dojo_id", effectiveDojoId)
        .eq("is_active", true)
        .order("name");
      return (data || []) as LeaderboardClassInfo[];
    },
    enabled: !!effectiveDojoId,
  });

  // Current live leaderboard
  const {
    data: leaderboard = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["leaderboard", effectiveDojoId],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      if (!effectiveDojoId) return [];

      // Get all approved profiles in this dojo
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, belt_grade")
        .eq("dojo_id", effectiveDojoId)
        .eq("registration_status", "aprovado");

      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) return [];

      const allUserIds = profiles.map((p) => p.user_id);

      // Exclude users with admin/sensei roles from leaderboard
      const { data: staffRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("user_id", allUserIds)
        .in("role", ["admin", "sensei", "dono", "super_admin"]);

      const staffIds = new Set((staffRoles || []).map((r) => r.user_id));
      const studentProfiles = profiles.filter((p) => !staffIds.has(p.user_id));
      if (studentProfiles.length === 0) return [];

      const userIds = studentProfiles.map((p) => p.user_id);

      // Get XP data, achievements, and class enrollments in parallel
      const [xpRes, achievementRes, enrollmentRes] = await Promise.all([
        supabase.from("student_xp").select("*").in("user_id", userIds),
        supabase.from("student_achievements").select("user_id").in("user_id", userIds),
        supabase.from("class_students").select("student_id, class_id, classes(martial_art)").in("student_id", userIds),
      ]);

      const achievementCounts = new Map<string, number>();
      achievementRes.data?.forEach((a) => {
        achievementCounts.set(a.user_id, (achievementCounts.get(a.user_id) || 0) + 1);
      });

      const xpMap = new Map((xpRes.data || []).map((x) => [x.user_id, x]));

      // Build class enrollment map
      const classMap = new Map<string, string[]>();
      const artMap = new Map<string, Set<string>>();
      (enrollmentRes.data || []).forEach((e: any) => {
        if (!classMap.has(e.student_id)) classMap.set(e.student_id, []);
        classMap.get(e.student_id)!.push(e.class_id);
        if (!artMap.has(e.student_id)) artMap.set(e.student_id, new Set());
        if (e.classes?.martial_art) artMap.get(e.student_id)!.add(e.classes.martial_art);
      });

      // Build entries (only students)
      const entries: LeaderboardEntry[] = studentProfiles.map((p) => {
        const xp = xpMap.get(p.user_id);
        return {
          user_id: p.user_id,
          name: p.name,
          avatar_url: p.avatar_url,
          belt_grade: p.belt_grade,
          total_xp: (xp?.total_xp as number) || 0,
          level: (xp?.level as number) || 1,
          current_streak: (xp?.current_streak as number) || 0,
          rank: 0,
          achievement_count: achievementCounts.get(p.user_id) || 0,
          class_ids: classMap.get(p.user_id) || [],
          martial_arts: [...(artMap.get(p.user_id) || [])],
        };
      });

      // Sort by XP descending
      entries.sort((a, b) => b.total_xp - a.total_xp);

      // Assign ranks
      entries.forEach((entry, idx) => {
        entry.rank = idx + 1;
      });

      return entries;
    },
    enabled: !!effectiveDojoId,
  });

  // Realtime for XP changes
  useEffect(() => {
    if (!effectiveDojoId) return;

    const channel = supabase
      .channel(`leaderboard-${effectiveDojoId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "student_xp" },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveDojoId, refetch]);

  // Historical leaderboards
  const { data: history = [] } = useQuery({
    queryKey: ["leaderboard-history", effectiveDojoId],
    queryFn: async (): Promise<LeaderboardHistoryEntry[]> => {
      if (!effectiveDojoId) return [];

      const { data, error } = await supabase
        .from("leaderboard_history")
        .select("*")
        .eq("dojo_id", effectiveDojoId)
        .order("year", { ascending: false })
        .order("final_rank", { ascending: true });

      if (error) throw error;

      // Enrich with names
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((d) => d.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name")
          .in("user_id", userIds);

        const nameMap = new Map(
          profiles?.map((p) => [p.user_id, p.name]) || []
        );

        return data.map((d) => ({
          ...d,
          name: nameMap.get(d.user_id) || "Desconhecido",
        })) as LeaderboardHistoryEntry[];
      }

      return data as LeaderboardHistoryEntry[];
    },
    enabled: !!effectiveDojoId,
  });

  // Current user's position
  const myRank = leaderboard.find((e) => e.user_id === user?.id)?.rank || null;
  const myEntry = leaderboard.find((e) => e.user_id === user?.id) || null;
  const topThree = leaderboard.slice(0, 3);
  const topTen = leaderboard.slice(0, 10);

  // Available martial arts from classes
  const availableMartialArts = [...new Set(dojoClasses.map((c) => c.martial_art))];

  return {
    leaderboard,
    isLoading,
    history,
    myRank,
    myEntry,
    topThree,
    topTen,
    totalParticipants: leaderboard.length,
    dojoClasses,
    availableMartialArts,
  };
}

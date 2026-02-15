import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const year = now.getFullYear() - 1; // Archive the previous year

    // Get all dojos
    const { data: dojos } = await supabase.from("dojos").select("id");
    if (!dojos || dojos.length === 0) {
      return new Response(JSON.stringify({ message: "No dojos found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalArchived = 0;
    let totalReset = 0;
    const topThreeByDojo: Record<string, { user_id: string; name: string; rank: number; xp: number }[]> = {};

    for (const dojo of dojos) {
      // Get all approved students in this dojo with XP
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name")
        .eq("dojo_id", dojo.id)
        .eq("registration_status", "aprovado");

      if (!profiles || profiles.length === 0) continue;

      const userIds = profiles.map((p) => p.user_id);
      const nameMap = new Map(profiles.map((p) => [p.user_id, p.name]));

      // Get XP data
      const { data: xpData } = await supabase
        .from("student_xp")
        .select("*")
        .in("user_id", userIds);

      if (!xpData || xpData.length === 0) continue;

      // Sort by XP descending
      const sorted = [...xpData].sort((a, b) => b.total_xp - a.total_xp);

      // Archive to leaderboard_history
      const historyEntries = sorted.map((entry, idx) => ({
        user_id: entry.user_id,
        dojo_id: dojo.id,
        year,
        final_xp: entry.total_xp,
        final_rank: idx + 1,
      }));

      // Check if already archived for this year
      const { count } = await supabase
        .from("leaderboard_history")
        .select("id", { count: "exact", head: true })
        .eq("dojo_id", dojo.id)
        .eq("year", year);

      if ((count || 0) === 0 && historyEntries.length > 0) {
        const { error } = await supabase.from("leaderboard_history").insert(historyEntries);
        if (!error) totalArchived += historyEntries.length;
      }

      // Top 3 for awards
      const top3 = sorted.slice(0, 3).map((entry, idx) => ({
        user_id: entry.user_id,
        name: nameMap.get(entry.user_id) || "Unknown",
        rank: idx + 1,
        xp: entry.total_xp,
      }));
      topThreeByDojo[dojo.id] = top3;

      // Award annual achievements to top 3
      const { data: annualAchievements } = await supabase
        .from("achievements")
        .select("*")
        .eq("is_annual", true)
        .eq("annual_year", year);

      if (annualAchievements) {
        for (const achievement of annualAchievements) {
          for (const winner of top3) {
            // Check criteria (e.g., rank-based)
            if (achievement.criteria_type === "annual_rank" && winner.rank <= achievement.criteria_value) {
              await supabase.from("student_achievements").upsert(
                { user_id: winner.user_id, achievement_id: achievement.id },
                { onConflict: "user_id,achievement_id" }
              );

              await supabase.from("notifications").insert({
                user_id: winner.user_id,
                title: `🏆 Premiação Anual ${year}!`,
                message: `Parabéns! Você ficou em ${winner.rank}º lugar no ranking anual! +${achievement.xp_reward} XP`,
                type: "achievement",
                related_id: achievement.id,
              });
            }
          }
        }
      }

      // Notify top 3
      for (const winner of top3) {
        const medals = ["🥇", "🥈", "🥉"];
        await supabase.from("notifications").insert({
          user_id: winner.user_id,
          title: `${medals[winner.rank - 1]} Ranking Anual ${year}`,
          message: `Você ficou em ${winner.rank}º lugar com ${winner.xp} XP! Parabéns pelo ano incrível!`,
          type: "annual_ranking",
        });
      }

      // Reset XP for new year
      const { error: resetError } = await supabase
        .from("student_xp")
        .update({
          total_xp: 0,
          level: 1,
          current_streak: 0,
          longest_streak: 0,
          last_activity_date: null,
        })
        .in("user_id", userIds);

      if (!resetError) totalReset += userIds.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        year,
        totalArchived,
        totalReset,
        topThreeByDojo,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

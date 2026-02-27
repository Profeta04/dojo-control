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
    // Only allow internal/service calls
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    if (!token || (token !== supabaseKey && token !== anonKey)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const year = now.getFullYear() - 1;

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
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name")
        .eq("dojo_id", dojo.id)
        .eq("registration_status", "aprovado");

      if (!profiles || profiles.length === 0) continue;

      const userIds = profiles.map((p) => p.user_id);
      const nameMap = new Map(profiles.map((p) => [p.user_id, p.name]));

      const { data: xpData } = await supabase
        .from("student_xp")
        .select("*")
        .in("user_id", userIds);

      if (!xpData || xpData.length === 0) continue;

      const sorted = [...xpData].sort((a, b) => b.total_xp - a.total_xp);

      const historyEntries = sorted.map((entry, idx) => ({
        user_id: entry.user_id,
        dojo_id: dojo.id,
        year,
        final_xp: entry.total_xp,
        final_rank: idx + 1,
      }));

      const { count } = await supabase
        .from("leaderboard_history")
        .select("id", { count: "exact", head: true })
        .eq("dojo_id", dojo.id)
        .eq("year", year);

      if ((count || 0) === 0 && historyEntries.length > 0) {
        const { error } = await supabase.from("leaderboard_history").insert(historyEntries);
        if (!error) totalArchived += historyEntries.length;
      }

      const top3 = sorted.slice(0, 3).map((entry, idx) => ({
        user_id: entry.user_id,
        name: nameMap.get(entry.user_id) || "Unknown",
        rank: idx + 1,
        xp: entry.total_xp,
      }));
      topThreeByDojo[dojo.id] = top3;

      // Notify top 3
      const medals = ["🥇", "🥈", "🥉"];
      for (const winner of top3) {
        await supabase.from("notifications").insert({
          user_id: winner.user_id,
          title: `${medals[winner.rank - 1]} Ranking Anual ${year}`,
          message: `Você ficou em ${winner.rank}º lugar com ${winner.xp} XP! Parabéns pelo ano incrível!`,
          type: "annual_ranking",
        });
      }

      // Reset XP
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

    // --- Season end: close active season, award top 3 ---
    const { data: activeSeason } = await supabase
      .from("seasons")
      .select("*")
      .eq("is_active", true)
      .maybeSingle();

    let seasonResults = null;

    if (activeSeason) {
      // Get season XP leaderboard
      const { data: seasonXpData } = await supabase
        .from("season_xp")
        .select("*")
        .eq("season_id", activeSeason.id)
        .order("total_xp", { ascending: false });

      if (seasonXpData && seasonXpData.length > 0) {
        const seasonTop3 = seasonXpData.slice(0, 3);
        const medals = ["🥇", "🥈", "🥉"];
        const rewardTypes = ["title", "border", "badge"];

        for (let i = 0; i < seasonTop3.length; i++) {
          const entry = seasonTop3[i];

          // Award title
          if (activeSeason.title_reward) {
            await supabase.from("season_rewards").upsert({
              user_id: entry.user_id,
              season_id: activeSeason.id,
              reward_type: "title",
              reward_value: activeSeason.title_reward,
              final_rank: i + 1,
              final_xp: entry.total_xp,
            }, { onConflict: "user_id,season_id,reward_type" });
          }

          // Award border
          if (activeSeason.border_style && i === 0) {
            await supabase.from("season_rewards").upsert({
              user_id: entry.user_id,
              season_id: activeSeason.id,
              reward_type: "border",
              reward_value: activeSeason.border_style,
              final_rank: 1,
              final_xp: entry.total_xp,
            }, { onConflict: "user_id,season_id,reward_type" });
          }

          // Badge for all top 3
          await supabase.from("season_rewards").upsert({
            user_id: entry.user_id,
            season_id: activeSeason.id,
            reward_type: "badge",
            reward_value: `${activeSeason.name} - ${medals[i]} ${i + 1}º lugar`,
            final_rank: i + 1,
            final_xp: entry.total_xp,
          }, { onConflict: "user_id,season_id,reward_type" });

          // Notify
          await supabase.from("notifications").insert({
            user_id: entry.user_id,
            title: `${medals[i]} Temporada ${activeSeason.name}`,
            message: `Você ficou em ${i + 1}º lugar na temporada com ${entry.total_xp} XP!`,
            type: "season_reward",
          });
        }

        seasonResults = { season: activeSeason.name, top3: seasonTop3.slice(0, 3).map((e, i) => ({ rank: i + 1, xp: e.total_xp, user_id: e.user_id })) };
      }

      // Deactivate current season
      await supabase.from("seasons").update({ is_active: false }).eq("id", activeSeason.id);

      // Activate next season
      const { data: nextSeason } = await supabase
        .from("seasons")
        .select("*")
        .gt("start_date", activeSeason.end_date)
        .order("start_date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextSeason) {
        await supabase.from("seasons").update({ is_active: true }).eq("id", nextSeason.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        year,
        totalArchived,
        totalReset,
        topThreeByDojo,
        seasonResults,
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

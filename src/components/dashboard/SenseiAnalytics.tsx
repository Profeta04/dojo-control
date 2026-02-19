import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDojoContext } from "@/hooks/useDojoContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BarChart3, Crown, CheckCircle2, Flame, Target, TrendingUp
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import React from "react";

function getCSSColor(varName: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value ? `hsl(${value})` : "hsl(0 0% 50%)";
}

export function SenseiAnalytics() {
  const { currentDojoId } = useDojoContext();

  const [colors, setColors] = React.useState({
    accent: "hsl(4, 85%, 50%)",
    success: "hsl(142, 70%, 40%)",
  });

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setColors({
        accent: getCSSColor("--accent"),
        success: getCSSColor("--success"),
      });
    }, 50);
    return () => clearTimeout(timer);
  });

  const { data, isLoading } = useQuery({
    queryKey: ["sensei-analytics", currentDojoId],
    queryFn: async () => {
      if (!currentDojoId) return null;

      // Get approved student IDs for this dojo
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, belt_grade")
        .eq("dojo_id", currentDojoId)
        .eq("registration_status", "aprovado");

      const studentIds = (profiles || []).map(p => p.user_id);
      if (studentIds.length === 0) return { ranking: [], monthlyAcertos: [], completionRate: 0, totalAcertos: 0 };

      // Fetch completed tasks and XP in parallel
      const [tasksRes, xpRes] = await Promise.all([
        supabase.from("tasks").select("completed_at, assigned_to, status").in("assigned_to", studentIds),
        supabase.from("student_xp").select("*").in("user_id", studentIds),
      ]);

      const tasks = tasksRes.data || [];
      const xpList = xpRes.data || [];

      // Completion rate & total
      const completedTasks = tasks.filter(t => t.status === "concluida");
      const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

      // Top students by XP (pontos)
      const xpMap = new Map(xpList.map(x => [x.user_id, x]));
      const ranking = (profiles || [])
        .map(p => ({
          ...p,
          total_xp: (xpMap.get(p.user_id)?.total_xp as number) || 0,
          level: (xpMap.get(p.user_id)?.level as number) || 1,
          current_streak: (xpMap.get(p.user_id)?.current_streak as number) || 0,
        }))
        .sort((a, b) => b.total_xp - a.total_xp)
        .slice(0, 5);

      // Monthly acertos (last 6 months)
      const now = new Date();
      const monthlyAcertos = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const mStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
        const mEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");
        const monthName = format(monthDate, "MMM", { locale: ptBR });

        const monthCompleted = completedTasks.filter(t =>
          t.completed_at && t.completed_at >= mStart && t.completed_at <= mEnd + "T23:59:59"
        ).length;

        monthlyAcertos.push({ name: monthName, acertos: monthCompleted });
      }

      return {
        completionRate,
        totalAcertos: completedTasks.length,
        ranking,
        monthlyAcertos,
      };
    },
    enabled: !!currentDojoId,
  });

  if (isLoading || !data) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-accent" />
        Análise de Tarefas & Gamificação
      </h2>

      {/* Stats row - only completion rate and total acertos */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <Target className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.completionRate}%</p>
              <p className="text-[11px] text-muted-foreground">Taxa de conclusão</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.totalAcertos}</p>
              <p className="text-[11px] text-muted-foreground">Total de acertos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Monthly acertos chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              Acertos por Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyAcertos}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="acertos" name="Acertos" fill={colors.success} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top 5 Ranking by Pontos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" />
              Top 5 Pontos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.ranking.map((student, idx) => {
              const medals = ["🥇", "🥈", "🥉"];
              const publicUrl = student.avatar_url
                ? supabase.storage.from("avatars").getPublicUrl(student.avatar_url).data.publicUrl
                : null;

              return (
                <div key={student.user_id} className="flex items-center gap-2.5 py-1.5">
                  <span className="text-sm w-6 text-center">
                    {idx < 3 ? medals[idx] : `#${idx + 1}`}
                  </span>
                  <Avatar className="h-7 w-7 border border-border">
                    <AvatarImage src={publicUrl || undefined} />
                    <AvatarFallback className="text-[10px] font-bold bg-primary/10">
                      {student.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{student.name.split(" ")[0]}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">Nv.{student.level}</span>
                      {student.current_streak > 0 && (
                        <span className="text-[10px] text-orange-500 flex items-center gap-0.5">
                          <Flame className="h-2.5 w-2.5" />{student.current_streak}d
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-accent">{student.total_xp} pts</span>
                </div>
              );
            })}
            {data.ranking.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Sem dados de pontos ainda</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

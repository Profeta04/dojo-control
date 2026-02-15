import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDojoContext } from "@/hooks/useDojoContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BeltBadge } from "@/components/shared/BeltBadge";
import {
  BarChart3, Users, AlertTriangle, TrendingUp, Crown,
  CheckCircle2, Clock, Flame, Target
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area
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
    warning: "hsl(38, 92%, 50%)",
    destructive: "hsl(0, 84%, 50%)",
  });

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setColors({
        accent: getCSSColor("--accent"),
        success: getCSSColor("--success"),
        warning: getCSSColor("--warning"),
        destructive: getCSSColor("--destructive"),
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
      if (studentIds.length === 0) return { students: [], tasks: [], xpData: [], monthlyTasks: [], completionRate: 0, overdueStudents: [] };

      // Fetch tasks and XP in parallel
      const [tasksRes, xpRes] = await Promise.all([
        supabase.from("tasks").select("*").in("assigned_to", studentIds),
        supabase.from("student_xp").select("*").in("user_id", studentIds),
      ]);

      const tasks = tasksRes.data || [];
      const xpList = xpRes.data || [];

      // Completion rate
      const completedTasks = tasks.filter(t => t.status === "concluida");
      const pendingTasks = tasks.filter(t => t.status === "pendente");
      const overdueTasks = pendingTasks.filter(t => t.due_date && new Date(t.due_date) < new Date());
      const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

      // Overdue students (students with overdue tasks)
      const overdueStudentIds = [...new Set(overdueTasks.map(t => t.assigned_to))];
      const overdueStudents = (profiles || [])
        .filter(p => overdueStudentIds.includes(p.user_id))
        .map(p => ({
          ...p,
          overdueCount: overdueTasks.filter(t => t.assigned_to === p.user_id).length,
        }));

      // Top students by XP
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

      // Monthly task completion evolution (last 6 months)
      const now = new Date();
      const monthlyTasks = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const mStart = format(startOfMonth(monthDate), "yyyy-MM-dd");
        const mEnd = format(endOfMonth(monthDate), "yyyy-MM-dd");
        const monthName = format(monthDate, "MMM", { locale: ptBR });

        const monthCompleted = completedTasks.filter(t =>
          t.completed_at && t.completed_at >= mStart && t.completed_at <= mEnd + "T23:59:59"
        ).length;

        const monthCreated = tasks.filter(t =>
          t.created_at >= mStart && t.created_at <= mEnd + "T23:59:59"
        ).length;

        monthlyTasks.push({ name: monthName, concluidas: monthCompleted, criadas: monthCreated });
      }

      return {
        totalTasks: tasks.length,
        completedCount: completedTasks.length,
        pendingCount: pendingTasks.length,
        overdueCount: overdueTasks.length,
        completionRate,
        overdueStudents,
        ranking,
        monthlyTasks,
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

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              <p className="text-2xl font-bold">{data.completedCount}</p>
              <p className="text-[11px] text-muted-foreground">Concluídas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.pendingCount}</p>
              <p className="text-[11px] text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-destructive">{data.overdueCount}</p>
              <p className="text-[11px] text-muted-foreground">Atrasadas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Monthly evolution chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              Evolução Mensal de Tarefas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyTasks}>
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
                  <Bar dataKey="criadas" name="Criadas" fill={colors.warning} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="concluidas" name="Concluídas" fill={colors.success} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top 5 Ranking */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" />
              Top 5 XP
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
                  <span className="text-xs font-bold text-accent">{student.total_xp} XP</span>
                </div>
              );
            })}
            {data.ranking.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Sem dados de XP ainda</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue students */}
      {data.overdueStudents.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Alunos com Tarefas Atrasadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.overdueStudents.map((s) => (
                <Badge key={s.user_id} variant="destructive" className="flex items-center gap-1.5 py-1">
                  {s.name.split(" ")[0]}
                  <span className="bg-destructive-foreground/20 px-1 rounded text-[10px]">{s.overdueCount}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

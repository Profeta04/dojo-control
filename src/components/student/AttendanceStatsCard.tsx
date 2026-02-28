import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck, TrendingUp, Flame, CalendarX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  percentage: number;
  currentStreak: number;
}

export function AttendanceStatsCard() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["student-attendance-stats", user?.id],
    queryFn: async (): Promise<AttendanceStats> => {
      if (!user?.id) return { total: 0, present: 0, absent: 0, percentage: 0, currentStreak: 0 };

      const { data, error } = await supabase
        .from("attendance")
        .select("date, present")
        .eq("student_id", user.id)
        .order("date", { ascending: false });

      if (error) throw error;

      const total = data?.length || 0;
      const present = data?.filter(a => a.present).length || 0;
      const absent = total - present;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      // Calculate current streak
      let currentStreak = 0;
      if (data) {
        for (const record of data) {
          if (record.present) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      return { total, present, absent, percentage, currentStreak };
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
  return (
    <Card data-tour="attendance-stats">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const getPercentageColor = (pct: number) => {
    if (pct >= 80) return "text-success";
    if (pct >= 60) return "text-warning";
    return "text-destructive";
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 80) return "[&>div]:bg-success";
    if (pct >= 60) return "[&>div]:bg-warning";
    return "[&>div]:bg-destructive";
  };

  return (
    <Card data-tour="attendance-stats">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <CalendarCheck className="h-5 w-5 text-accent" />
          Frequência
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Taxa de presença</span>
            <span className={`font-bold ${getPercentageColor(stats.percentage)}`}>
              {stats.percentage}%
            </span>
          </div>
          <Progress value={stats.percentage} className={`h-2.5 ${getProgressColor(stats.percentage)}`} />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-3.5 text-center border border-primary/10">
            <TrendingUp className="h-4 w-4 mx-auto mb-1.5 text-primary" />
            <p className="text-2xl font-extrabold text-foreground">{stats.total}</p>
            <p className="text-[11px] font-medium text-muted-foreground mt-0.5">Total de aulas</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-success/10 to-success/5 p-3.5 text-center border border-success/10">
            <CalendarCheck className="h-4 w-4 mx-auto mb-1.5 text-success" />
            <p className="text-2xl font-extrabold text-success">{stats.present}</p>
            <p className="text-[11px] font-medium text-muted-foreground mt-0.5">Presenças</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-destructive/10 to-destructive/5 p-3.5 text-center border border-destructive/10">
            <CalendarX className="h-4 w-4 mx-auto mb-1.5 text-destructive" />
            <p className="text-2xl font-extrabold text-destructive">{stats.absent}</p>
            <p className="text-[11px] font-medium text-muted-foreground mt-0.5">Faltas</p>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-warning/10 to-warning/5 p-3.5 text-center border border-warning/10">
            <Flame className="h-4 w-4 mx-auto mb-1.5 text-warning" />
            <p className="text-2xl font-extrabold text-warning">{stats.currentStreak}</p>
            <p className="text-[11px] font-medium text-muted-foreground mt-0.5">Sequência atual</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

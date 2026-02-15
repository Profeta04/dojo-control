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
      <Card>
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
    if (pct >= 80) return "text-green-600";
    if (pct >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 80) return "[&>div]:bg-green-500";
    if (pct >= 60) return "[&>div]:bg-yellow-500";
    return "[&>div]:bg-red-500";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarCheck className="h-5 w-5" />
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
          <div className="rounded-lg bg-muted p-3 text-center border border-border/50">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total de aulas</p>
          </div>
          <div className="rounded-lg bg-muted p-3 text-center border border-border/50">
            <CalendarCheck className="h-4 w-4 mx-auto mb-1 text-green-600" />
            <p className="text-2xl font-bold text-green-600">{stats.present}</p>
            <p className="text-xs text-muted-foreground">Presenças</p>
          </div>
          <div className="rounded-lg bg-muted p-3 text-center border border-border/50">
            <CalendarX className="h-4 w-4 mx-auto mb-1 text-red-500" />
            <p className="text-2xl font-bold text-red-500">{stats.absent}</p>
            <p className="text-xs text-muted-foreground">Faltas</p>
          </div>
          <div className="rounded-lg bg-muted p-3 text-center border border-border/50">
            <Flame className="h-4 w-4 mx-auto mb-1 text-orange-500" />
            <p className="text-2xl font-bold text-orange-500">{stats.currentStreak}</p>
            <p className="text-xs text-muted-foreground">Sequência atual</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

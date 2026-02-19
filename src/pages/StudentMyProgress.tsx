import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { GraduationTimeline } from "@/components/student/GraduationTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, differenceInMonths, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarCheck, Flame, Clock, Target, TrendingUp, Award } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function StatCard({ icon: Icon, label, value, sub, className }: { icon: any; label: string; value: string | number; sub?: string; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn("h-full", className)}>
        <CardContent className="pt-4 pb-3 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
            <Icon className="h-5 w-5 text-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold leading-tight">{value}</p>
            {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function StudentMyProgress() {
  const { user, profile, loading: authLoading } = useAuth();

  // Fetch attendance data
  const { data: attendanceData } = useQuery({
    queryKey: ["my-progress-attendance", user?.id],
    queryFn: async () => {
      if (!user?.id) return { total: 0, monthly: [] as { month: string; count: number }[] };

      const { data, error } = await supabase
        .from("attendance")
        .select("date, present")
        .eq("student_id", user.id)
        .eq("present", true)
        .order("date", { ascending: true });

      if (error) throw error;

      const total = data?.length || 0;

      // Group by last 6 months
      const now = new Date();
      const monthly: { month: string; count: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthLabel = format(monthStart, "MMM", { locale: ptBR });
        const count = (data || []).filter(a => {
          const d = new Date(a.date);
          return d.getMonth() === monthStart.getMonth() && d.getFullYear() === monthStart.getFullYear();
        }).length;
        monthly.push({ month: monthLabel, count });
      }

      // First attendance date
      const firstDate = data && data.length > 0 ? data[0].date : null;

      return { total, monthly, firstDate };
    },
    enabled: !!user?.id,
  });

  // Fetch XP and streak
  const { data: xpData } = useQuery({
    queryKey: ["my-progress-xp", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("student_xp")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch completed tasks count
  const { data: tasksCount = 0 } = useQuery({
    queryKey: ["my-progress-tasks", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("assigned_to", user.id)
        .eq("status", "aprovada");

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });

  // Fetch graduation history for stats
  const { data: graduations = [] } = useQuery({
    queryKey: ["my-progress-graduations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("graduation_history")
        .select("*")
        .eq("student_id", user.id)
        .order("graduation_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Dojo average attendance (anonymous comparison)
  const { data: dojoAvg } = useQuery({
    queryKey: ["my-progress-dojo-avg", profile?.dojo_id],
    queryFn: async () => {
      if (!profile?.dojo_id) return null;

      // Get all students in the dojo
      const { data: dojoStudents } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("dojo_id", profile.dojo_id)
        .eq("registration_status", "aprovado");

      if (!dojoStudents || dojoStudents.length === 0) return null;

      // Get attendance for current month
      const monthStart = startOfMonth(new Date());
      const { count: totalAttendance } = await supabase
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("present", true)
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .in("student_id", dojoStudents.map(s => s.user_id));

      const avgPerStudent = (totalAttendance || 0) / dojoStudents.length;
      return Math.round(avgPerStudent * 10) / 10;
    },
    enabled: !!profile?.dojo_id,
  });

  if (authLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  const daysInDojo = attendanceData?.firstDate
    ? differenceInDays(new Date(), new Date(attendanceData.firstDate))
    : profile?.created_at
      ? differenceInDays(new Date(), new Date(profile.created_at))
      : 0;

  const monthsInDojo = Math.max(1, Math.floor(daysInDojo / 30));
  const avgPerMonth = attendanceData ? Math.round((attendanceData.total / monthsInDojo) * 10) / 10 : 0;

  // My attendance this month
  const myThisMonth = attendanceData?.monthly?.[attendanceData.monthly.length - 1]?.count || 0;
  const aboveAverage = dojoAvg !== null && dojoAvg !== undefined && myThisMonth > dojoAvg;

  const lastGraduation = graduations.length > 0 ? graduations[graduations.length - 1] : null;
  const daysSinceLastGrad = lastGraduation
    ? differenceInDays(new Date(), new Date(lastGraduation.graduation_date))
    : null;

  return (
    <RequireApproval>
      <DashboardLayout>
        <PageHeader 
          title="Meu Progresso" 
          description="Acompanhe sua evolução no dojo" 
        />
        
        <div className="mt-4 space-y-5">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={Clock}
              label="Tempo no dojo"
              value={daysInDojo > 365 ? `${Math.floor(daysInDojo / 365)}a ${Math.floor((daysInDojo % 365) / 30)}m` : `${monthsInDojo} meses`}
              sub={`${daysInDojo} dias`}
            />
            <StatCard
              icon={CalendarCheck}
              label="Total de treinos"
              value={attendanceData?.total || 0}
              sub={`~${avgPerMonth}/mês`}
            />
            <StatCard
              icon={Flame}
              label="Melhor streak"
              value={`${xpData?.longest_streak || 0} dias`}
              sub={xpData?.current_streak ? `Atual: ${xpData.current_streak} dias` : "Sem streak ativo"}
            />
            <StatCard
              icon={Target}
              label="Missões concluídas"
              value={tasksCount}
              sub={`Nível ${xpData?.level || 1} • ${xpData?.total_xp || 0} XP`}
            />
          </div>

          {/* Dojo comparison */}
          {dojoAvg !== null && dojoAvg !== undefined && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <Card className={cn(
                "border-l-4",
                aboveAverage ? "border-l-green-500" : "border-l-amber-500"
              )}>
                <CardContent className="py-3 flex items-center gap-3">
                  <TrendingUp className={cn("h-5 w-5", aboveAverage ? "text-green-500" : "text-amber-500")} />
                  <div>
                    <p className="text-sm font-medium">
                      {aboveAverage
                        ? "Acima da média do dojo! 💪"
                        : "Abaixo da média do dojo este mês"
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Seus treinos este mês: <strong>{myThisMonth}</strong> • Média do dojo: <strong>{dojoAvg}</strong>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Days since last graduation */}
          {daysSinceLastGrad !== null && (
            <Card>
              <CardContent className="py-3 flex items-center gap-3">
                <Award className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-sm font-medium">
                    {daysSinceLastGrad} dias desde a última graduação
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {graduations.length} graduação(ões) no total
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Graduation Timeline */}
          <GraduationTimeline />
        </div>
      </DashboardLayout>
    </RequireApproval>
  );
}
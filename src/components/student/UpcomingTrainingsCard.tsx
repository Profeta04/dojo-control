import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export function UpcomingTrainingsCard() {
  const { user } = useAuth();

  const { data: trainings, isLoading } = useQuery({
    queryKey: ["upcoming-trainings", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get student's class IDs
      const { data: enrollments } = await supabase
        .from("class_students")
        .select("class_id, classes:class_id (id, name, is_active)")
        .eq("student_id", user.id);

      const activeClasses = enrollments?.filter(e => e.classes?.is_active) || [];
      if (activeClasses.length === 0) return [];

      const classIds = activeClasses.map(e => e.class_id);
      const classNames = activeClasses.reduce((acc, e) => {
        acc[e.class_id] = e.classes?.name || "Treino";
        return acc;
      }, {} as Record<string, string>);

      const today = format(new Date(), "yyyy-MM-dd");
      const limit = format(addDays(new Date(), 14), "yyyy-MM-dd");

      const { data: schedules, error } = await supabase
        .from("class_schedule")
        .select("id, date, start_time, end_time, class_id, is_cancelled")
        .in("class_id", classIds)
        .gte("date", today)
        .lte("date", limit)
        .eq("is_cancelled", false)
        .order("date")
        .order("start_time")
        .limit(5);

      if (error) throw error;

      return (schedules || []).map(s => ({
        id: s.id,
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time,
        class_name: classNames[s.class_id] || "Treino",
      }));
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
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (t: string) => t.slice(0, 5);

  const isToday = (dateStr: string) => {
    return dateStr === format(new Date(), "yyyy-MM-dd");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <Calendar className="h-5 w-5 text-accent" />
          Próximos Treinos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!trainings || trainings.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum treino agendado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {trainings.map(t => (
              <div
                key={t.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors border border-border/40"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center min-w-[48px]">
                    <span className="text-xs text-muted-foreground uppercase">
                      {format(new Date(t.date + "T00:00:00"), "EEE", { locale: ptBR })}
                    </span>
                    <span className="text-lg font-bold">
                      {format(new Date(t.date + "T00:00:00"), "dd")}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium text-sm">{t.class_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(t.start_time)} - {formatTime(t.end_time)}</span>
                    </div>
                  </div>
                </div>
                {isToday(t.date) && (
                  <Badge className="bg-accent text-accent-foreground">Hoje</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

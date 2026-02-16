import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, QrCode, AlertTriangle } from "lucide-react";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { fireConfetti } from "@/lib/confetti";

interface AvailableClass {
  scheduleId: string;
  classId: string;
  className: string;
  startTime: string;
  endTime: string;
  alreadyCheckedIn: boolean;
}

export default function Checkin() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState<string | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user && token) {
      navigate(`/auth?redirect=/checkin/${token}`);
    }
  }, [authLoading, user, token, navigate]);

  // Lookup dojo by token
  const { data: dojo, isLoading: dojoLoading, error: dojoError } = useQuery({
    queryKey: ["checkin-dojo", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dojo_by_checkin_token", {
        _token: token!,
      });
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Dojo não encontrado");
      return data[0] as { id: string; name: string; logo_url: string | null };
    },
    enabled: !!token && !!user,
  });

  // Fetch available classes for today
  const { data: classes, isLoading: classesLoading, refetch } = useQuery({
    queryKey: ["checkin-classes", dojo?.id, today, user?.id],
    queryFn: async () => {
      if (!dojo || !user) return [];

      // Get student's enrolled classes in this dojo
      const { data: enrollments } = await supabase
        .from("class_students")
        .select("class_id")
        .eq("student_id", user.id);

      if (!enrollments || enrollments.length === 0) return [];
      const enrolledIds = enrollments.map((e) => e.class_id);

      // Get classes that belong to this dojo
      const { data: dojoClasses } = await supabase
        .from("classes")
        .select("id, name")
        .eq("dojo_id", dojo.id)
        .in("id", enrolledIds);

      if (!dojoClasses || dojoClasses.length === 0) return [];
      const dojoClassIds = dojoClasses.map((c) => c.id);

      // Get today's schedules
      const { data: schedules } = await supabase
        .from("class_schedule")
        .select("*")
        .eq("date", today)
        .eq("is_cancelled", false)
        .in("class_id", dojoClassIds)
        .order("start_time");

      if (!schedules || schedules.length === 0) return [];

      // Check existing attendance
      const { data: existingAttendance } = await supabase
        .from("attendance")
        .select("class_id")
        .eq("student_id", user.id)
        .eq("date", today)
        .eq("self_checked_in", true)
        .in("class_id", dojoClassIds);

      const checkedClassIds = new Set(existingAttendance?.map((a) => a.class_id) || []);

      const now = new Date();
      const result: AvailableClass[] = [];

      for (const schedule of schedules) {
        const classInfo = dojoClasses.find((c) => c.id === schedule.class_id);
        if (!classInfo) continue;

        // Check time window: 1h before to 1h after
        const [startH, startM] = schedule.start_time.split(":").map(Number);
        const [endH, endM] = schedule.end_time.split(":").map(Number);
        
        const classStart = new Date();
        classStart.setHours(startH, startM, 0, 0);
        const classEnd = new Date();
        classEnd.setHours(endH, endM, 0, 0);

        const minutesBefore = differenceInMinutes(classStart, now);
        const minutesAfterEnd = differenceInMinutes(now, classEnd);

        // Allow checkin from 1h before start to 1h after end
        if (minutesBefore <= 60 && minutesAfterEnd <= 60) {
          result.push({
            scheduleId: schedule.id,
            classId: schedule.class_id,
            className: classInfo.name,
            startTime: schedule.start_time,
            endTime: schedule.end_time,
            alreadyCheckedIn: checkedClassIds.has(schedule.class_id),
          });
        }
      }

      return result;
    },
    enabled: !!dojo && !!user,
  });

  const handleCheckin = async (cls: AvailableClass) => {
    if (!user || cls.alreadyCheckedIn) return;
    setSubmitting(cls.classId);

    try {
      const { error } = await supabase.from("attendance").insert({
        class_id: cls.classId,
        student_id: user.id,
        date: today,
        present: true,
        self_checked_in: true,
        marked_by: user.id,
      });

      if (error) {
        if (error.message.includes("duplicate") || error.code === "23505") {
          toast({ title: "Presença já registrada", description: "Você já registrou presença nesta aula." });
        } else {
          throw error;
        }
      } else {
        fireConfetti();
        toast({ title: "Presença confirmada! 🎉", description: `${cls.className} — ${cls.startTime.slice(0, 5)}` });
        refetch();
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(null);
    }
  };

  if (authLoading || dojoLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (dojoError || !dojo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-sm w-full text-center">
          <CardContent className="pt-6 space-y-4">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
            <h2 className="text-lg font-semibold">QR Code inválido</h2>
            <p className="text-sm text-muted-foreground">
              Este QR Code não corresponde a nenhum dojo ativo. Verifique com seu sensei.
            </p>
            <Button onClick={() => navigate("/dashboard")} variant="outline">
              Ir para o Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center">
              <QrCode className="h-8 w-8 text-accent" />
            </div>
          </div>
          <CardTitle>{dojo.name}</CardTitle>
          <CardDescription>
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {classesLoading ? (
            <LoadingSpinner />
          ) : !classes || classes.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <Clock className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Nenhuma aula disponível para check-in no momento.
              </p>
              <p className="text-xs text-muted-foreground">
                O check-in é permitido de 1h antes até 1h após o horário da aula.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Selecione sua aula para confirmar presença:
              </p>
              {classes.map((cls) => (
                <Card
                  key={cls.classId}
                  className={`transition-colors ${
                    cls.alreadyCheckedIn
                      ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                      : ""
                  }`}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{cls.className}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {cls.startTime.slice(0, 5)} - {cls.endTime.slice(0, 5)}
                      </p>
                    </div>
                    {cls.alreadyCheckedIn ? (
                      <Badge className="bg-green-600 gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Confirmado
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleCheckin(cls)}
                        disabled={submitting === cls.classId}
                      >
                        {submitting === cls.classId ? "..." : "Confirmar"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

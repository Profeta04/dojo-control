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
import { playCheckin } from "@/lib/sounds";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Clock, QrCode, AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { fireConfetti } from "@/lib/confetti";
import { motion } from "framer-motion";

interface AvailableClass {
  scheduleId: string;
  classId: string;
  className: string;
  startTime: string;
  endTime: string;
  alreadyCheckedIn: boolean;
  status: "open" | "early" | "late";
  statusMessage: string;
}

export default function Checkin() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [confirmClass, setConfirmClass] = useState<AvailableClass | null>(null);
  const [successClass, setSuccessClass] = useState<AvailableClass | null>(null);

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

  // Fetch available classes for today — show ALL enrolled, with time status
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

        const [startH, startM] = schedule.start_time.split(":").map(Number);
        const [endH, endM] = schedule.end_time.split(":").map(Number);

        const classStart = new Date();
        classStart.setHours(startH, startM, 0, 0);
        const classEnd = new Date();
        classEnd.setHours(endH, endM, 0, 0);

        const minutesBefore = differenceInMinutes(classStart, now);
        const minutesAfterEnd = differenceInMinutes(now, classEnd);

        let status: AvailableClass["status"] = "open";
        let statusMessage = "";

        if (minutesBefore > 60) {
          status = "early";
          statusMessage = `Abre ${minutesBefore - 60 > 60 ? `em ${Math.floor((minutesBefore - 60) / 60)}h${(minutesBefore - 60) % 60 > 0 ? `${(minutesBefore - 60) % 60}min` : ""}` : `em ${minutesBefore - 60}min`}`;
        } else if (minutesAfterEnd > 60) {
          status = "late";
          statusMessage = "Encerrado";
        } else {
          status = "open";
          statusMessage = "Disponível agora";
        }

        result.push({
          scheduleId: schedule.id,
          classId: schedule.class_id,
          className: classInfo.name,
          startTime: schedule.start_time,
          endTime: schedule.end_time,
          alreadyCheckedIn: checkedClassIds.has(schedule.class_id),
          status,
          statusMessage,
        });
      }

      return result;
    },
    enabled: !!dojo && !!user,
  });

  const handleCheckin = async (cls: AvailableClass) => {
    if (!user || cls.alreadyCheckedIn || cls.status !== "open") return;
    setSubmitting(cls.classId);
    setConfirmClass(null);

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
        playCheckin();
        setSuccessClass(cls);
        refetch();
      }
    } catch (err: any) {
      toast({ title: "Erro ao registrar presença", description: err.message, variant: "destructive" });
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
            <div className="text-center py-8 space-y-4">
              <div className="h-16 w-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground">Nenhuma aula hoje</p>
                <p className="text-sm text-muted-foreground">
                  Não encontramos aulas agendadas para você hoje neste dojo.
                </p>
                <p className="text-xs text-muted-foreground">
                  Verifique se você está matriculado em uma turma com aula hoje.
                </p>
              </div>
              <Button onClick={() => navigate("/dashboard")} className="w-full mt-2">
                Voltar ao Início
              </Button>
            </div>
          ) : classes.every((cls) => cls.status !== "open" && !cls.alreadyCheckedIn) ? (
            <div className="text-center py-8 space-y-4">
              <div className="h-16 w-16 mx-auto rounded-full bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-warning" />
              </div>
              <div className="space-y-1">
                <p className="font-medium text-foreground">Fora do horário de check-in</p>
                <p className="text-sm text-muted-foreground">
                  Você tem {classes.length === 1 ? "1 aula" : `${classes.length} aulas`} hoje, mas nenhuma está no horário disponível para registrar presença.
                </p>
                <p className="text-xs text-muted-foreground">
                  O check-in é liberado até 1 hora antes e 1 hora após o término da aula.
                </p>
              </div>
              <div className="space-y-2 text-left">
                {classes.map((cls) => (
                  <div key={cls.classId} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{cls.className}</p>
                      <p className="text-xs text-muted-foreground">
                        {cls.startTime.slice(0, 5)} - {cls.endTime.slice(0, 5)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {cls.statusMessage}
                    </Badge>
                  </div>
                ))}
              </div>
              <Button onClick={() => navigate("/dashboard")} className="w-full mt-2">
                Voltar ao Início
              </Button>
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
                      ? "bg-success/5 border-success/20"
                      : cls.status !== "open"
                      ? "opacity-60"
                      : ""
                  }`}
                >
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{cls.className}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3 flex-shrink-0" />
                        {cls.startTime.slice(0, 5)} - {cls.endTime.slice(0, 5)}
                      </p>
                      {cls.status !== "open" && !cls.alreadyCheckedIn && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {cls.statusMessage}
                        </p>
                      )}
                    </div>
                    {cls.alreadyCheckedIn ? (
                      <Badge className="bg-success text-success-foreground gap-1 flex-shrink-0">
                        <CheckCircle2 className="h-3 w-3" />
                        Confirmado
                      </Badge>
                    ) : cls.status === "open" ? (
                      <Button
                        size="sm"
                        className="flex-shrink-0"
                        onClick={() => setConfirmClass(cls)}
                        disabled={submitting === cls.classId}
                      >
                        {submitting === cls.classId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Confirmar"
                        )}
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="flex-shrink-0">
                        {cls.statusMessage}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
              <Button variant="outline" onClick={() => navigate("/dashboard")} className="w-full mt-2">
                Voltar ao Início
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <Dialog open={!!confirmClass} onOpenChange={(open) => !open && setConfirmClass(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar Presença</DialogTitle>
            <DialogDescription>
              Deseja registrar presença na aula abaixo?
            </DialogDescription>
          </DialogHeader>
          {confirmClass && (
            <div className="bg-muted/50 rounded-lg p-4 text-center space-y-1">
              <p className="font-semibold text-lg">{confirmClass.className}</p>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                <Clock className="h-4 w-4" />
                {confirmClass.startTime.slice(0, 5)} - {confirmClass.endTime.slice(0, 5)}
              </p>
              <p className="text-xs text-muted-foreground">{dojo.name}</p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmClass(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => confirmClass && handleCheckin(confirmClass)}
              disabled={!!submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
              )}
              Confirmar Presença
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success dialog */}
      <Dialog open={!!successClass} onOpenChange={(open) => {
        if (!open) {
          setSuccessClass(null);
          navigate(-1);
        }
      }}>
        <DialogContent className="max-w-sm text-center">
          <div className="flex flex-col items-center gap-4 py-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="h-20 w-20 rounded-full bg-accent/10 flex items-center justify-center"
            >
              <ShieldCheck className="h-10 w-10 text-accent" />
            </motion.div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-foreground">Presença Confirmada! 🎉</h3>
              {successClass && (
                <>
                  <p className="text-sm font-medium">{successClass.className}</p>
                  <p className="text-sm text-muted-foreground">
                    {successClass.startTime.slice(0, 5)} - {successClass.endTime.slice(0, 5)}
                  </p>
                </>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Seu sensei já pode ver sua presença registrada.
              </p>
            </div>
            <Button onClick={() => { setSuccessClass(null); navigate(-1); }} className="w-full mt-2">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

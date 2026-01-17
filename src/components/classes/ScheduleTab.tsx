import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  CalendarDays, 
  Clock, 
  Users,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Loader2,
  Undo2
} from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { format, isSameDay, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type ClassSchedule = Tables<"class_schedule">;
type Class = Tables<"classes">;

interface ScheduleWithClass extends ClassSchedule {
  className: string;
  senseiName: string;
  classId: string;
}

export function ScheduleTab() {
  const { user, canManageStudents } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleWithClass | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Fetch ALL classes (not just active) to show schedule correctly
  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ["classes-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*");

      if (error) throw error;
      return data as Class[];
    },
    enabled: !!user,
  });

  // Fetch senseis profiles - get ALL profiles that are senseis
  const { data: senseiProfiles, isLoading: senseiLoading } = useQuery({
    queryKey: ["senseis-profiles-all"],
    queryFn: async () => {
      // First get all sensei user_ids
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "sensei");

      // Also get admin user_ids (they can also be senseis of classes)
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      const allUserIds = [
        ...(roles?.map(r => r.user_id) || []),
        ...(adminRoles?.map(r => r.user_id) || [])
      ];

      if (allUserIds.length === 0) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", allUserIds);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch schedules for current month - only depends on user
  const { data: schedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ["class-schedules", format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      const { data, error } = await supabase
        .from("class_schedule")
        .select("*")
        .gte("date", format(monthStart, "yyyy-MM-dd"))
        .lte("date", format(monthEnd, "yyyy-MM-dd"))
        .order("date")
        .order("start_time");

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Enrich schedules with class and sensei info
  const enrichedSchedules = useMemo(() => {
    if (!schedules) return [];
    
    return schedules.map((schedule) => {
      const classInfo = classes?.find((c) => c.id === schedule.class_id);
      const sensei = senseiProfiles?.find((s) => s.user_id === classInfo?.sensei_id);

      return {
        ...schedule,
        className: classInfo?.name || "Turma",
        senseiName: sensei?.name || "Sensei",
        classId: schedule.class_id,
      } as ScheduleWithClass;
    });
  }, [schedules, classes, senseiProfiles]);

  const getSchedulesForDate = (date: Date) => {
    return enrichedSchedules.filter((s) => isSameDay(new Date(s.date + "T00:00:00"), date));
  };

  const datesWithSchedules = useMemo(() => {
    if (!enrichedSchedules) return [];
    return enrichedSchedules.map((s) => new Date(s.date + "T00:00:00"));
  }, [enrichedSchedules]);

  const selectedDateSchedules = getSchedulesForDate(selectedDate);

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const openDetail = (schedule: ScheduleWithClass) => {
    setSelectedSchedule(schedule);
    setDetailDialogOpen(true);
  };

  const openCancelDialog = (schedule: ScheduleWithClass) => {
    setSelectedSchedule(schedule);
    setCancelReason("");
    setCancelDialogOpen(true);
  };

  const handleCancelClass = async () => {
    if (!selectedSchedule || !user) return;

    setFormLoading(true);

    try {
      // Update the schedule to cancelled
      const { error: updateError } = await supabase
        .from("class_schedule")
        .update({ 
          is_cancelled: true, 
          notes: cancelReason || "Aula cancelada" 
        })
        .eq("id", selectedSchedule.id);

      if (updateError) throw updateError;

      // Get all students enrolled in this class
      const { data: enrollments } = await supabase
        .from("class_students")
        .select("student_id")
        .eq("class_id", selectedSchedule.classId);

      // Create notifications for all enrolled students
      if (enrollments && enrollments.length > 0) {
        const notifications = enrollments.map((enrollment) => ({
          user_id: enrollment.student_id,
          title: "Aula Cancelada",
          message: `A aula de ${selectedSchedule.className} do dia ${format(new Date(selectedSchedule.date + "T00:00:00"), "dd/MM/yyyy")} às ${selectedSchedule.start_time.slice(0, 5)} foi cancelada.${cancelReason ? ` Motivo: ${cancelReason}` : ""}`,
          type: "schedule",
          related_id: selectedSchedule.id,
        }));

        const { error: notifError } = await supabase
          .from("notifications")
          .insert(notifications);

        if (notifError) {
          console.error("Error creating notifications:", notifError);
        }
      }

      toast({
        title: "Aula cancelada",
        description: `A aula foi cancelada e ${enrollments?.length || 0} aluno(s) foram notificados.`,
      });

      setCancelDialogOpen(false);
      setDetailDialogOpen(false);
      setCancelReason("");
      queryClient.invalidateQueries({ queryKey: ["class-schedules"] });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao cancelar aula",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleRestoreClass = async (schedule: ScheduleWithClass) => {
    if (!user) return;

    setFormLoading(true);

    try {
      const { error } = await supabase
        .from("class_schedule")
        .update({ is_cancelled: false, notes: null })
        .eq("id", schedule.id);

      if (error) throw error;

      toast({
        title: "Aula restaurada",
        description: "A aula foi reativada com sucesso.",
      });

      setDetailDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["class-schedules"] });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao restaurar aula",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  const isLoading = classesLoading || senseiLoading || schedulesLoading;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
        {/* Calendar */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              locale={ptBR}
              className="rounded-md pointer-events-auto"
              modifiers={{
                hasSchedule: datesWithSchedules,
              }}
              modifiersClassNames={{
                hasSchedule: "bg-primary/20 font-bold text-primary",
              }}
              classNames={{
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              }}
            />

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-primary/20" />
                <span>Dia com aula</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-primary" />
                <span>Dia selecionado</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </CardTitle>
            <CardDescription>
              {selectedDateSchedules.length === 0
                ? "Nenhuma aula agendada"
                : `${selectedDateSchedules.length} aula(s) agendada(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {selectedDateSchedules.length > 0 ? (
                <div className="divide-y">
                  {selectedDateSchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className={cn(
                        "p-4 hover:bg-muted/50 transition-colors cursor-pointer",
                        schedule.is_cancelled && "opacity-60"
                      )}
                      onClick={() => openDetail(schedule)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-primary" />
                            <span className="font-medium">{schedule.className}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>{schedule.senseiName}</span>
                          </div>
                        </div>
                        {schedule.is_cancelled && (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Cancelada
                          </Badge>
                        )}
                      </div>
                      {schedule.notes && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {schedule.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <CalendarDays className="h-12 w-12 mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma aula neste dia</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Classes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Próximas Aulas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {enrichedSchedules && enrichedSchedules.filter(s => new Date(s.date + "T00:00:00") >= new Date() && !s.is_cancelled).length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {enrichedSchedules
                .filter((s) => new Date(s.date + "T00:00:00") >= new Date() && !s.is_cancelled)
                .slice(0, 6)
                .map((schedule) => (
                  <div
                    key={schedule.id}
                    className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => openDetail(schedule)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">
                        {format(new Date(schedule.date + "T00:00:00"), "dd/MM", { locale: ptBR })}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatTime(schedule.start_time)}
                      </span>
                    </div>
                    <p className="font-medium">{schedule.className}</p>
                    <p className="text-sm text-muted-foreground">{schedule.senseiName}</p>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma aula agendada para os próximos dias.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Schedule Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              {selectedSchedule?.className}
            </DialogTitle>
            <DialogDescription>
              {selectedSchedule && format(new Date(selectedSchedule.date + "T00:00:00"), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>

          {selectedSchedule && (
            <div className="space-y-4">
              {selectedSchedule.is_cancelled && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive font-medium flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Esta aula foi cancelada
                  </p>
                </div>
              )}

              <div className="grid gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Horário</p>
                    <p className="font-medium">
                      {formatTime(selectedSchedule.start_time)} - {formatTime(selectedSchedule.end_time)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sensei</p>
                    <p className="font-medium">{selectedSchedule.senseiName}</p>
                  </div>
                </div>
              </div>

              {selectedSchedule.notes && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm">{selectedSchedule.notes}</p>
                </div>
              )}

              {/* Cancel/Restore actions for managers */}
              {canManageStudents && (
                <div className="pt-4 border-t flex gap-2">
                  {selectedSchedule.is_cancelled ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleRestoreClass(selectedSchedule)}
                      disabled={formLoading}
                    >
                      {formLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Undo2 className="h-4 w-4 mr-2" />
                      )}
                      Restaurar Aula
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => openCancelDialog(selectedSchedule)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancelar Aula
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Aula</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar a aula de {selectedSchedule?.className} do dia{" "}
              {selectedSchedule && format(new Date(selectedSchedule.date + "T00:00:00"), "dd/MM/yyyy")}?
              <br /><br />
              Todos os alunos matriculados serão notificados automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="cancelReason">Motivo (opcional)</Label>
            <Textarea
              id="cancelReason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ex: Sensei indisponível, feriado, etc."
              rows={2}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={formLoading}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelClass}
              className="bg-destructive hover:bg-destructive/90"
              disabled={formLoading}
            >
              {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

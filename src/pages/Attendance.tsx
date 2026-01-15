import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Calendar, CheckCircle2, XCircle, Users, Clock, Loader2, Save, CalendarDays } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { format, isToday, isFuture, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

type ClassSchedule = Tables<"class_schedule">;
type Profile = Tables<"profiles">;
type Attendance = Tables<"attendance">;

interface ScheduleWithDetails extends ClassSchedule {
  className: string;
  students: Profile[];
  attendance: Attendance[];
}

interface StudentAttendance {
  student: Profile;
  present: boolean;
  notes: string;
}

export default function AttendancePage() {
  const { user, canManageStudents, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleWithDetails | null>(null);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [attendanceList, setAttendanceList] = useState<StudentAttendance[]>([]);
  const [formLoading, setFormLoading] = useState(false);

  // Fetch scheduled classes for selected date
  const { data: schedules, isLoading } = useQuery({
    queryKey: ["schedules", selectedDate],
    queryFn: async () => {
      const { data: schedulesData, error } = await supabase
        .from("class_schedule")
        .select("*")
        .eq("date", selectedDate)
        .eq("is_cancelled", false)
        .order("start_time");

      if (error) throw error;
      if (!schedulesData) return [];

      const schedulesWithDetails: ScheduleWithDetails[] = await Promise.all(
        schedulesData.map(async (schedule) => {
          // Get class info
          const { data: classData } = await supabase
            .from("classes")
            .select("name")
            .eq("id", schedule.class_id)
            .single();

          // Get enrolled students
          const { data: enrollments } = await supabase
            .from("class_students")
            .select("student_id")
            .eq("class_id", schedule.class_id);

          let students: Profile[] = [];
          if (enrollments && enrollments.length > 0) {
            const studentIds = enrollments.map((e) => e.student_id);
            const { data: studentProfiles } = await supabase
              .from("profiles")
              .select("*")
              .in("user_id", studentIds)
              .order("name");
            students = studentProfiles || [];
          }

          // Get existing attendance for this class/date
          const { data: attendanceData } = await supabase
            .from("attendance")
            .select("*")
            .eq("class_id", schedule.class_id)
            .eq("date", selectedDate);

          return {
            ...schedule,
            className: classData?.name || "Turma desconhecida",
            students,
            attendance: attendanceData || [],
          };
        })
      );

      return schedulesWithDetails;
    },
    enabled: !!user,
  });

  // Get available dates with scheduled classes
  const { data: availableDates } = useQuery({
    queryKey: ["available-dates"],
    queryFn: async () => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 30); // Last 30 days
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 30); // Next 30 days

      const { data, error } = await supabase
        .from("class_schedule")
        .select("date")
        .gte("date", format(startDate, "yyyy-MM-dd"))
        .lte("date", format(endDate, "yyyy-MM-dd"))
        .eq("is_cancelled", false)
        .order("date");

      if (error) throw error;
      return [...new Set(data?.map((d) => d.date) || [])];
    },
    enabled: !!user,
  });

  const openAttendanceDialog = (schedule: ScheduleWithDetails) => {
    setSelectedSchedule(schedule);
    
    // Initialize attendance list with existing data or defaults
    const initialList = schedule.students.map((student) => {
      const existing = schedule.attendance.find((a) => a.student_id === student.user_id);
      return {
        student,
        present: existing?.present ?? false,
        notes: existing?.notes || "",
      };
    });
    
    setAttendanceList(initialList);
    setAttendanceDialogOpen(true);
  };

  const toggleAttendance = (studentId: string) => {
    setAttendanceList((prev) =>
      prev.map((item) =>
        item.student.user_id === studentId
          ? { ...item, present: !item.present }
          : item
      )
    );
  };

  const updateNotes = (studentId: string, notes: string) => {
    setAttendanceList((prev) =>
      prev.map((item) =>
        item.student.user_id === studentId ? { ...item, notes } : item
      )
    );
  };

  const markAllPresent = () => {
    setAttendanceList((prev) => prev.map((item) => ({ ...item, present: true })));
  };

  const markAllAbsent = () => {
    setAttendanceList((prev) => prev.map((item) => ({ ...item, present: false })));
  };

  const handleSaveAttendance = async () => {
    if (!selectedSchedule || !user) return;

    setFormLoading(true);

    try {
      // Delete existing attendance for this class/date
      await supabase
        .from("attendance")
        .delete()
        .eq("class_id", selectedSchedule.class_id)
        .eq("date", selectedDate);

      // Insert new attendance records
      const attendanceRecords = attendanceList.map((item) => ({
        class_id: selectedSchedule.class_id,
        student_id: item.student.user_id,
        date: selectedDate,
        present: item.present,
        notes: item.notes || null,
        marked_by: user.id,
      }));

      const { error } = await supabase.from("attendance").insert(attendanceRecords);

      if (error) throw error;

      const presentCount = attendanceList.filter((a) => a.present).length;
      toast({
        title: "Presença registrada!",
        description: `${presentCount} de ${attendanceList.length} aluno(s) presente(s).`,
      });

      setAttendanceDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["schedules", selectedDate] });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar presença",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const getAttendanceStatus = (schedule: ScheduleWithDetails) => {
    if (schedule.students.length === 0) return "empty";
    if (schedule.attendance.length === 0) return "pending";
    if (schedule.attendance.length < schedule.students.length) return "partial";
    return "complete";
  };

  const getAttendanceStats = (schedule: ScheduleWithDetails) => {
    const present = schedule.attendance.filter((a) => a.present).length;
    const total = schedule.students.length;
    return { present, total };
  };

  if (authLoading || isLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <PageHeader title="Presenças" description="Controle de presença das aulas" />
        
        <div className="flex items-center gap-2">
          <Label htmlFor="date-select" className="sr-only">Selecionar data</Label>
          <Select value={selectedDate} onValueChange={setSelectedDate}>
            <SelectTrigger className="w-[200px]" id="date-select">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableDates?.map((date) => (
                <SelectItem key={date} value={date}>
                  {format(new Date(date + "T12:00:00"), "EEEE, dd/MM", { locale: ptBR })}
                  {isToday(new Date(date + "T12:00:00")) && " (Hoje)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Date indicator */}
      <div className="mb-6">
        <Badge variant={isToday(new Date(selectedDate + "T12:00:00")) ? "default" : "secondary"} className="text-sm">
          <CalendarDays className="h-4 w-4 mr-1" />
          {format(new Date(selectedDate + "T12:00:00"), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </Badge>
      </div>

      {schedules && schedules.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {schedules.map((schedule) => {
            const status = getAttendanceStatus(schedule);
            const stats = getAttendanceStats(schedule);
            const dateObj = new Date(schedule.date + "T12:00:00");

            return (
              <Card key={schedule.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5 text-accent" />
                        {schedule.className}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                      </CardDescription>
                    </div>
                    {status === "complete" ? (
                      <Badge className="bg-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completo
                      </Badge>
                    ) : status === "partial" ? (
                      <Badge variant="secondary">Parcial</Badge>
                    ) : status === "empty" ? (
                      <Badge variant="outline">Sem alunos</Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Pendente
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Alunos matriculados:</span>
                    <span className="font-medium">{schedule.students.length}</span>
                  </div>
                  
                  {schedule.attendance.length > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Presentes:</span>
                      <span className="font-medium text-green-600">
                        {stats.present} / {stats.total}
                      </span>
                    </div>
                  )}

                  {canManageStudents && schedule.students.length > 0 && (
                    <Button
                      className="w-full"
                      variant={status === "complete" ? "outline" : "default"}
                      onClick={() => openAttendanceDialog(schedule)}
                    >
                      {status === "complete" ? "Editar Presença" : "Marcar Presença"}
                    </Button>
                  )}

                  {!canManageStudents && schedule.students.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        {status === "complete" 
                          ? `Presença registrada: ${stats.present} presente(s)`
                          : "Presença ainda não registrada"
                        }
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma aula agendada</h3>
            <p className="text-muted-foreground">
              Não há aulas programadas para {format(new Date(selectedDate + "T12:00:00"), "dd/MM/yyyy")}.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Attendance Dialog */}
      <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Marcar Presença</DialogTitle>
            <DialogDescription>
              {selectedSchedule?.className} - {format(new Date(selectedDate + "T12:00:00"), "dd/MM/yyyy")} às {selectedSchedule?.start_time.slice(0, 5)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Quick actions */}
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={markAllPresent}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Todos Presentes
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={markAllAbsent}>
                <XCircle className="h-4 w-4 mr-1" />
                Todos Ausentes
              </Button>
            </div>

            {/* Student list */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {attendanceList.map((item) => (
                <div
                  key={item.student.user_id}
                  className={`p-3 rounded-lg border transition-colors ${
                    item.present 
                      ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" 
                      : "bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={`attendance-${item.student.user_id}`}
                      checked={item.present}
                      onCheckedChange={() => toggleAttendance(item.student.user_id)}
                    />
                    <label
                      htmlFor={`attendance-${item.student.user_id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <span className="font-medium">{item.student.name}</span>
                      {item.student.belt_grade && (
                        <Badge variant="outline" className="ml-2 text-xs capitalize">
                          {item.student.belt_grade.replace("_", " ")}
                        </Badge>
                      )}
                    </label>
                    {item.present ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  {!item.present && (
                    <div className="mt-2 pl-7">
                      <Textarea
                        placeholder="Observação (opcional)"
                        value={item.notes}
                        onChange={(e) => updateNotes(item.student.user_id, e.target.value)}
                        rows={1}
                        className="text-sm resize-none"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                <span className="text-green-600 font-medium">
                  {attendanceList.filter((a) => a.present).length}
                </span>
                {" "}presente(s) de{" "}
                <span className="font-medium">{attendanceList.length}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAttendanceDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveAttendance}
                  disabled={formLoading}
                  className="bg-accent hover:bg-accent/90"
                >
                  {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

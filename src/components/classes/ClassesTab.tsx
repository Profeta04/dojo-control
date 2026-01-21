import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Plus, GraduationCap, Users, Clock, UserPlus, UserMinus, Loader2, Edit, Trash2, CalendarDays, X } from "lucide-react";
import { z } from "zod";
import { Tables } from "@/integrations/supabase/types";
import { format, isSameDay, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

type Class = Tables<"classes">;
type Profile = Tables<"profiles">;
type ClassSchedule = Tables<"class_schedule">;

interface ClassWithDetails extends Class {
  sensei?: Profile;
  students?: Profile[];
  studentCount?: number;
  schedules?: ClassSchedule[];
}

const classSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  description: z.string().optional(),
  max_students: z.number().min(1, "Mínimo 1 aluno").optional(),
});

export function ClassesTab() {
  const { user, canManageStudents } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassWithDetails | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxStudents, setMaxStudents] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [editMode, setEditMode] = useState(false);

  // Schedule form state
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [startTime, setStartTime] = useState("19:00");
  const [endTime, setEndTime] = useState("20:00");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch classes with details
  const { data: classes, isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data: classesData, error } = await supabase
        .from("classes")
        .select("*")
        .order("name");

      if (error) throw error;
      if (!classesData) return [];

      const classesWithDetails: ClassWithDetails[] = await Promise.all(
        classesData.map(async (cls) => {
          const { data: senseiProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", cls.sensei_id)
            .single();

          const { data: enrollments } = await supabase
            .from("class_students")
            .select("student_id")
            .eq("class_id", cls.id);

          let students: Profile[] = [];
          if (enrollments && enrollments.length > 0) {
            const studentIds = enrollments.map((e) => e.student_id);
            const { data: studentProfiles } = await supabase
              .from("profiles")
              .select("*")
              .in("user_id", studentIds);
            students = studentProfiles || [];
          }

          // Fetch schedules for this class
          const { data: schedules } = await supabase
            .from("class_schedule")
            .select("*")
            .eq("class_id", cls.id)
            .gte("date", format(startOfMonth(new Date()), "yyyy-MM-dd"))
            .order("date");

          return {
            ...cls,
            sensei: senseiProfile || undefined,
            students,
            studentCount: students.length,
            schedules: schedules || [],
          };
        })
      );

      return classesWithDetails;
    },
    enabled: !!user,
  });

  // Fetch available students (excluding guardians)
  const { data: availableStudents } = useQuery({
    queryKey: ["available-students", selectedClass?.id],
    queryFn: async () => {
      if (!selectedClass) return [];

      const { data: studentRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");

      if (!studentRoles || studentRoles.length === 0) return [];

      const studentUserIds = studentRoles.map((r) => r.user_id);

      // Get all guardian user IDs (users who have minors linked to them)
      const { data: guardianProfiles } = await supabase
        .from("profiles")
        .select("guardian_user_id")
        .not("guardian_user_id", "is", null);

      const guardianUserIds = [...new Set(guardianProfiles?.map((p) => p.guardian_user_id).filter(Boolean) || [])];

      // Exclude guardian user IDs from student list
      const filteredStudentUserIds = studentUserIds.filter((id) => !guardianUserIds.includes(id));

      if (filteredStudentUserIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", filteredStudentUserIds)
        .eq("registration_status", "aprovado");

      if (!profiles) return [];

      const enrolledIds = selectedClass.students?.map((s) => s.user_id) || [];
      return profiles.filter((p) => !enrolledIds.includes(p.user_id));
    },
    enabled: !!selectedClass && enrollDialogOpen,
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setMaxStudents("");
    setEditMode(false);
    setSelectedClass(null);
  };

  const resetScheduleForm = () => {
    setSelectedDates([]);
    setStartTime("19:00");
    setEndTime("20:00");
    setCurrentMonth(new Date());
  };

  const openEditDialog = (cls: ClassWithDetails) => {
    setSelectedClass(cls);
    setName(cls.name);
    setDescription(cls.description || "");
    setMaxStudents(cls.max_students?.toString() || "");
    setEditMode(true);
    setDialogOpen(true);
  };

  const openScheduleDialog = (cls: ClassWithDetails) => {
    setSelectedClass(cls);
    const existingDates = cls.schedules?.map((s) => new Date(s.date + "T00:00:00")) || [];
    setSelectedDates(existingDates);
    if (cls.schedules && cls.schedules.length > 0) {
      setStartTime(cls.schedules[0].start_time.slice(0, 5));
      setEndTime(cls.schedules[0].end_time.slice(0, 5));
    }
    setScheduleDialogOpen(true);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    setSelectedDates((prev) => {
      const exists = prev.some((d) => isSameDay(d, date));
      if (exists) {
        return prev.filter((d) => !isSameDay(d, date));
      }
      return [...prev, date];
    });
  };

  const handleCreateOrUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = classSchema.safeParse({
      name,
      description: description || undefined,
      max_students: maxStudents ? parseInt(maxStudents) : undefined,
    });

    if (!validation.success) {
      toast({
        title: "Erro de validação",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setFormLoading(true);

    try {
      const classData = {
        name,
        description: description || null,
        schedule: "Ver calendário",
        max_students: maxStudents ? parseInt(maxStudents) : null,
        sensei_id: user!.id,
        is_active: true,
      };

      if (editMode && selectedClass) {
        const { error } = await supabase
          .from("classes")
          .update(classData)
          .eq("id", selectedClass.id);

        if (error) throw error;

        toast({ title: "Turma atualizada!", description: `${name} foi atualizada.` });
      } else {
        const { error } = await supabase.from("classes").insert(classData);
        if (error) throw error;
        toast({ title: "Turma criada!", description: `${name} foi criada. Agora defina os dias de aula.` });
      }

      setDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao salvar turma", variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!selectedClass) return;

    setFormLoading(true);

    try {
      const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      await supabase
        .from("class_schedule")
        .delete()
        .eq("class_id", selectedClass.id)
        .gte("date", monthStart)
        .lte("date", monthEnd);

      const datesInMonth = selectedDates.filter(
        (d) => d >= startOfMonth(currentMonth) && d <= endOfMonth(currentMonth)
      );

      if (datesInMonth.length > 0) {
        const schedules = datesInMonth.map((date) => ({
          class_id: selectedClass.id,
          date: format(date, "yyyy-MM-dd"),
          start_time: startTime,
          end_time: endTime,
        }));

        const { error } = await supabase.from("class_schedule").insert(schedules);
        if (error) throw error;
      }

      toast({
        title: "Agenda atualizada!",
        description: `${datesInMonth.length} dia(s) agendado(s) para ${format(currentMonth, "MMMM yyyy", { locale: ptBR })}.`,
      });

      setScheduleDialogOpen(false);
      resetScheduleForm();
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao salvar agenda", variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  };

  const handleEnrollStudent = async () => {
    if (!selectedClass || !selectedStudentId) return;

    setFormLoading(true);

    try {
      const { error } = await supabase.from("class_students").insert({
        class_id: selectedClass.id,
        student_id: selectedStudentId,
      });

      if (error) throw error;

      toast({ title: "Aluno matriculado!", description: "Aluno adicionado à turma." });
      setEnrollDialogOpen(false);
      setSelectedStudentId("");
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  };

  const handleRemoveStudent = async (studentUserId: string) => {
    if (!selectedClass) return;

    try {
      await supabase
        .from("class_students")
        .delete()
        .eq("class_id", selectedClass.id)
        .eq("student_id", studentUserId);

      toast({ title: "Aluno removido", description: "Aluno removido da turma." });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteClass = async () => {
    if (!selectedClass) return;

    setFormLoading(true);

    try {
      await supabase.from("class_students").delete().eq("class_id", selectedClass.id);
      await supabase.from("class_schedule").delete().eq("class_id", selectedClass.id);
      const { error } = await supabase.from("classes").delete().eq("id", selectedClass.id);

      if (error) throw error;

      toast({ title: "Turma excluída", description: `${selectedClass.name} foi excluída.` });
      setDeleteDialogOpen(false);
      setSelectedClass(null);
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  };

  const getUpcomingDates = (schedules: ClassSchedule[] | undefined) => {
    if (!schedules) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return schedules
      .filter((s) => new Date(s.date) >= today && !s.is_cancelled)
      .slice(0, 3);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {canManageStudents && (
        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90">
                <Plus className="h-4 w-4 mr-2" />
                Nova Turma
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editMode ? "Editar Turma" : "Criar Nova Turma"}</DialogTitle>
                <DialogDescription>
                  {editMode ? "Atualize as informações da turma." : "Preencha os dados para criar uma nova turma."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateOrUpdateClass} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da turma *</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Turma Iniciante" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxStudents">Máximo de alunos</Label>
                  <Input id="maxStudents" type="number" min="1" value={maxStudents} onChange={(e) => setMaxStudents(e.target.value)} placeholder="Sem limite" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição opcional" rows={3} />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
                  <Button type="submit" className="bg-accent hover:bg-accent/90" disabled={formLoading}>
                    {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editMode ? "Salvar" : "Criar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {classes && classes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => {
            const upcomingDates = getUpcomingDates(cls.schedules);
            return (
              <Card key={cls.id} className={`${!cls.is_active ? "opacity-60" : ""}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-accent" />
                        {cls.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {cls.sensei?.name ? `Sensei: ${cls.sensei.name}` : ""}
                      </CardDescription>
                    </div>
                    <Badge variant={cls.is_active ? "default" : "secondary"}>
                      {cls.is_active ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Upcoming Schedule */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <CalendarDays className="h-4 w-4 text-accent" />
                      Próximas aulas
                    </div>
                    {upcomingDates.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {upcomingDates.map((schedule) => (
                          <Badge key={schedule.id} variant="outline" className="text-xs">
                            {format(new Date(schedule.date + "T00:00:00"), "dd/MM")} - {schedule.start_time.slice(0, 5)}
                          </Badge>
                        ))}
                        {(cls.schedules?.length || 0) > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{(cls.schedules?.length || 0) - 3}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Nenhuma aula agendada</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {cls.studentCount} aluno{cls.studentCount !== 1 ? "s" : ""}
                    {cls.max_students && ` / ${cls.max_students} vagas`}
                  </div>

                  {cls.description && <p className="text-sm text-muted-foreground">{cls.description}</p>}

                  {/* Students */}
                  {cls.students && cls.students.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Alunos:</p>
                      <div className="flex flex-wrap gap-1">
                        {cls.students.slice(0, 5).map((student) => (
                          <Badge key={student.user_id} variant="outline" className="text-xs">
                            {student.name?.split(" ")[0]}
                            {canManageStudents && (
                              <button onClick={() => { setSelectedClass(cls); handleRemoveStudent(student.user_id); }} className="ml-1 hover:text-destructive">
                                <UserMinus className="h-3 w-3" />
                              </button>
                            )}
                          </Badge>
                        ))}
                        {cls.students.length > 5 && <Badge variant="outline" className="text-xs">+{cls.students.length - 5}</Badge>}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {canManageStudents && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => openScheduleDialog(cls)}>
                        <CalendarDays className="h-4 w-4 mr-1" />
                        Agendar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setSelectedClass(cls); setEnrollDialogOpen(true); }}>
                        <UserPlus className="h-4 w-4 mr-1" />
                        Matricular
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEditDialog(cls)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { setSelectedClass(cls); setDeleteDialogOpen(true); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Nenhuma turma cadastrada ainda.</p>
            {canManageStudents && <p className="text-sm text-muted-foreground mt-1">Clique em "Nova Turma" para criar.</p>}
          </CardContent>
        </Card>
      )}

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={(open) => { setScheduleDialogOpen(open); if (!open) resetScheduleForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Agendar Aulas - {selectedClass?.name}</DialogTitle>
            <DialogDescription>
              Selecione os dias do mês e defina o horário das aulas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Horário de início</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Horário de término</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>

            <div className="flex justify-center">
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={(dates) => setSelectedDates(dates || [])}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                locale={ptBR}
                className="rounded-md border"
              />
            </div>

            <div className="text-sm text-muted-foreground text-center">
              {selectedDates.filter((d) => d >= startOfMonth(currentMonth) && d <= endOfMonth(currentMonth)).length} dia(s) selecionado(s) em {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </div>

            {selectedDates.length > 0 && (
              <div className="flex flex-wrap gap-1 max-h-24 overflow-auto">
                {selectedDates
                  .filter((d) => d >= startOfMonth(currentMonth) && d <= endOfMonth(currentMonth))
                  .sort((a, b) => a.getTime() - b.getTime())
                  .map((date) => (
                    <Badge key={date.toISOString()} variant="secondary" className="text-xs">
                      {format(date, "dd/MM")}
                      <button onClick={() => handleDateSelect(date)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => { setScheduleDialogOpen(false); resetScheduleForm(); }}>Cancelar</Button>
              <Button className="bg-accent hover:bg-accent/90" onClick={handleSaveSchedule} disabled={formLoading}>
                {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar Agenda
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enroll Dialog */}
      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Matricular Aluno</DialogTitle>
            <DialogDescription>Selecione um aluno para {selectedClass?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger><SelectValue placeholder="Selecione um aluno" /></SelectTrigger>
              <SelectContent>
                {availableStudents && availableStudents.length > 0 ? (
                  availableStudents.map((student) => (
                    <SelectItem key={student.user_id} value={student.user_id}>{student.name}</SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground text-center">Nenhum aluno disponível</div>
                )}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEnrollDialogOpen(false)}>Cancelar</Button>
              <Button className="bg-accent hover:bg-accent/90" onClick={handleEnrollStudent} disabled={!selectedStudentId || formLoading}>
                {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Matricular
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Turma</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir "{selectedClass?.name}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={formLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClass} className="bg-destructive hover:bg-destructive/90" disabled={formLoading}>
              {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

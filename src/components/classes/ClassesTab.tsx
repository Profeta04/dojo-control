import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDojoContext } from "@/hooks/useDojoContext";
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
import { Plus, GraduationCap, Users, Clock, UserPlus, UserMinus, Loader2, Edit, Trash2, CalendarDays, X, Search, Check } from "lucide-react";
import { z } from "zod";
import { Tables } from "@/integrations/supabase/types";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { format, isSameDay, startOfMonth, endOfMonth, differenceInYears } from "date-fns";
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
  const { user, profile, canManageStudents, isAdmin, isSensei } = useAuth();
  const { currentDojoId } = useDojoContext();
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
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [martialArt, setMartialArt] = useState("judo");
  const [senseiId, setSenseiId] = useState("");

  // Recurring weekly schedule
  interface WeeklySlot {
    day: number; // 0=Dom, 1=Seg, ..., 6=Sáb
    startTime: string;
    endTime: string;
  }
  const DAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const DAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const [weeklySlots, setWeeklySlots] = useState<WeeklySlot[]>([]);

  // Schedule form state - per-date times
  interface ScheduleEntry {
    date: Date;
    startTime: string;
    endTime: string;
  }
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [defaultStartTime, setDefaultStartTime] = useState("19:00");
  const [defaultEndTime, setDefaultEndTime] = useState("20:00");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch classes with details
  const { data: classes, isLoading } = useQuery({
    queryKey: ["classes", user?.id, isSensei, isAdmin, currentDojoId],
    queryFn: async () => {
      let query = supabase
        .from("classes")
        .select("*")
        .order("name");

      // Senseis only see their own classes
      if (isSensei && !isAdmin) {
        query = query.eq("sensei_id", user!.id);
      }

      // Filter by dojo if selected
      if (currentDojoId) {
        query = query.eq("dojo_id", currentDojoId);
      }

      const { data: classesData, error } = await query;
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

  // Fetch senseis for the current dojo
  const { data: availableSenseis } = useQuery({
    queryKey: ["available-senseis", currentDojoId],
    queryFn: async () => {
      if (!currentDojoId) {
        // If no dojo selected, fetch all senseis
        const { data: senseiRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "sensei");
        if (!senseiRoles || senseiRoles.length === 0) return [];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, email")
          .in("user_id", senseiRoles.map(r => r.user_id));
        return profiles || [];
      }
      const { data: dojoSenseis } = await supabase
        .from("dojo_senseis")
        .select("sensei_id")
        .eq("dojo_id", currentDojoId);
      if (!dojoSenseis || dojoSenseis.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", dojoSenseis.map(ds => ds.sensei_id));
      return profiles || [];
    },
    enabled: !!user && (isAdmin || isSensei),
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

      let profilesQuery = supabase
        .from("profiles")
        .select("*")
        .in("user_id", filteredStudentUserIds)
        .eq("registration_status", "aprovado");

      // Senseis can only enroll students from their dojo
      if (isSensei && !isAdmin && selectedClass.dojo_id) {
        profilesQuery = profilesQuery.eq("dojo_id", selectedClass.dojo_id);
      }

      const { data: profiles } = await profilesQuery;

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
    setMartialArt("judo");
    setSenseiId("");
    setWeeklySlots([]);
    setEditMode(false);
    setSelectedClass(null);
  };

  const resetScheduleForm = () => {
    setScheduleEntries([]);
    setDefaultStartTime("19:00");
    setDefaultEndTime("20:00");
    setCurrentMonth(new Date());
  };

  const openEditDialog = (cls: ClassWithDetails) => {
    setSelectedClass(cls);
    setName(cls.name);
    setDescription(cls.description || "");
    setMaxStudents(cls.max_students?.toString() || "");
    setMartialArt(cls.martial_art || "judo");
    setSenseiId(cls.sensei_id || "");
    // Parse existing weekly schedule from JSONB
    if (cls.schedule && Array.isArray(cls.schedule)) {
      setWeeklySlots((cls.schedule as any[]).map((s: any) => ({
        day: s.day ?? 0,
        startTime: s.startTime ?? "19:00",
        endTime: s.endTime ?? "20:00",
      })));
    } else {
      setWeeklySlots([]);
    }
    setEditMode(true);
    setDialogOpen(true);
  };

  const openScheduleDialog = (cls: ClassWithDetails) => {
    setSelectedClass(cls);
    // Build entries from existing schedules
    const entries: ScheduleEntry[] = cls.schedules?.map((s) => ({
      date: new Date(s.date + "T00:00:00"),
      startTime: s.start_time.slice(0, 5),
      endTime: s.end_time.slice(0, 5),
    })) || [];
    setScheduleEntries(entries);
    if (entries.length > 0) {
      setDefaultStartTime(entries[0].startTime);
      setDefaultEndTime(entries[0].endTime);
    }
    setScheduleDialogOpen(true);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    setScheduleEntries((prev) => {
      const exists = prev.some((e) => isSameDay(e.date, date));
      if (exists) {
        return prev.filter((e) => !isSameDay(e.date, date));
      }
      return [...prev, { date, startTime: defaultStartTime, endTime: defaultEndTime }];
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
        schedule: weeklySlots.length > 0 ? JSON.parse(JSON.stringify(weeklySlots)) : null,
        max_students: maxStudents ? parseInt(maxStudents) : null,
        martial_art: martialArt,
        sensei_id: senseiId || user!.id,
        dojo_id: currentDojoId || profile?.dojo_id || null,
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

      const entriesInMonth = scheduleEntries.filter(
        (e) => e.date >= startOfMonth(currentMonth) && e.date <= endOfMonth(currentMonth)
      );

      if (entriesInMonth.length > 0) {
        const schedules = entriesInMonth.map((entry) => ({
          class_id: selectedClass.id,
          date: format(entry.date, "yyyy-MM-dd"),
          start_time: entry.startTime,
          end_time: entry.endTime,
        }));

        const { error } = await supabase.from("class_schedule").insert(schedules);
        if (error) throw error;
      }

      toast({
        title: "Agenda atualizada!",
        description: `${entriesInMonth.length} dia(s) agendado(s) para ${format(currentMonth, "MMMM yyyy", { locale: ptBR })}.`,
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

  const handleEnrollStudents = async () => {
    if (!selectedClass || selectedStudentIds.length === 0) return;

    setFormLoading(true);

    try {
      const inserts = selectedStudentIds.map((studentId) => ({
        class_id: selectedClass.id,
        student_id: studentId,
      }));

      const { error } = await supabase.from("class_students").insert(inserts);

      if (error) throw error;

      toast({ 
        title: "Aluno(s) matriculado(s)!", 
        description: `${selectedStudentIds.length} aluno(s) adicionado(s) à turma.` 
      });
      setEnrollDialogOpen(false);
      setSelectedStudentIds([]);
      setStudentSearch("");
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
              <Button className="bg-accent hover:bg-accent/90" data-tour="create-class">
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
                  <Label htmlFor="martialArt">Arte marcial *</Label>
                  <Select value={martialArt} onValueChange={setMartialArt}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a arte marcial" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="judo">Judô</SelectItem>
                      <SelectItem value="bjj">Jiu-Jitsu (BJJ)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senseiId">Sensei responsável</Label>
                  <Select value={senseiId} onValueChange={setSenseiId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o sensei" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSenseis?.map((s) => (
                        <SelectItem key={s.user_id} value={s.user_id}>
                          {s.name} {s.email ? `(${s.email})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxStudents">Máximo de alunos</Label>
                  <Input id="maxStudents" type="number" min="1" value={maxStudents} onChange={(e) => setMaxStudents(e.target.value)} placeholder="Sem limite" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição opcional" rows={3} />
                </div>
                {/* Weekly Schedule Editor */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Horários semanais</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setWeeklySlots((prev) => [...prev, { day: 1, startTime: "19:00", endTime: "20:00" }])}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                  {weeklySlots.length === 0 && (
                    <p className="text-xs text-muted-foreground">Nenhum horário definido. Clique em "Adicionar" para definir os dias e horários das aulas.</p>
                  )}
                  {weeklySlots.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
                      <Select
                        value={slot.day.toString()}
                        onValueChange={(val) => {
                          const updated = [...weeklySlots];
                          updated[idx] = { ...updated[idx], day: parseInt(val) };
                          setWeeklySlots(updated);
                        }}
                      >
                        <SelectTrigger className="w-[110px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAY_LABELS.map((label, i) => (
                            <SelectItem key={i} value={i.toString()}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => {
                          const updated = [...weeklySlots];
                          updated[idx] = { ...updated[idx], startTime: e.target.value };
                          setWeeklySlots(updated);
                        }}
                        className="w-[100px] h-8 text-xs"
                      />
                      <span className="text-xs text-muted-foreground">às</span>
                      <Input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => {
                          const updated = [...weeklySlots];
                          updated[idx] = { ...updated[idx], endTime: e.target.value };
                          setWeeklySlots(updated);
                        }}
                        className="w-[100px] h-8 text-xs"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setWeeklySlots((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
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
                    <Badge variant="outline" className="text-xs">
                      {cls.martial_art === "bjj" ? "BJJ" : "Judô"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Weekly Recurring Schedule */}
                  {cls.schedule && Array.isArray(cls.schedule) && (cls.schedule as any[]).length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Clock className="h-4 w-4 text-accent" />
                        Horários
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(cls.schedule as any[])
                          .sort((a: any, b: any) => a.day - b.day)
                          .map((slot: any, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {DAY_SHORT[slot.day]} {slot.startTime}–{slot.endTime}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

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
              Selecione os dias do mês. Cada dia pode ter horário individual.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Horário padrão (início)</Label>
                <Input type="time" value={defaultStartTime} onChange={(e) => setDefaultStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Horário padrão (término)</Label>
                <Input type="time" value={defaultEndTime} onChange={(e) => setDefaultEndTime(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Novos dias usarão o horário padrão acima. Você pode ajustar cada dia individualmente abaixo.</p>

            <div className="flex justify-center">
              <Calendar
                mode="multiple"
                selected={scheduleEntries.map(e => e.date)}
                onSelect={(dates) => {
                  if (!dates) { setScheduleEntries([]); return; }
                  // Sync entries with selected dates
                  setScheduleEntries(prev => {
                    const newEntries: ScheduleEntry[] = dates.map(d => {
                      const existing = prev.find(e => isSameDay(e.date, d));
                      return existing || { date: d, startTime: defaultStartTime, endTime: defaultEndTime };
                    });
                    return newEntries;
                  });
                }}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                locale={ptBR}
                className="rounded-md border"
              />
            </div>

            <div className="text-sm text-muted-foreground text-center">
              {scheduleEntries.filter((e) => e.date >= startOfMonth(currentMonth) && e.date <= endOfMonth(currentMonth)).length} dia(s) selecionado(s) em {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
            </div>

            {scheduleEntries.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                {scheduleEntries
                  .filter((e) => e.date >= startOfMonth(currentMonth) && e.date <= endOfMonth(currentMonth))
                  .sort((a, b) => a.date.getTime() - b.date.getTime())
                  .map((entry, idx) => (
                    <div key={entry.date.toISOString()} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                      <Badge variant="outline" className="text-xs min-w-[50px] justify-center">
                        {format(entry.date, "dd/MM")}
                      </Badge>
                      <Input
                        type="time"
                        value={entry.startTime}
                        onChange={(e) => {
                          setScheduleEntries(prev => prev.map(en =>
                            isSameDay(en.date, entry.date) ? { ...en, startTime: e.target.value } : en
                          ));
                        }}
                        className="w-[100px] h-8 text-xs"
                      />
                      <span className="text-xs text-muted-foreground">às</span>
                      <Input
                        type="time"
                        value={entry.endTime}
                        onChange={(e) => {
                          setScheduleEntries(prev => prev.map(en =>
                            isSameDay(en.date, entry.date) ? { ...en, endTime: e.target.value } : en
                          ));
                        }}
                        className="w-[100px] h-8 text-xs"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setScheduleEntries(prev => prev.filter(en => !isSameDay(en.date, entry.date)))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
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
      <Dialog open={enrollDialogOpen} onOpenChange={(open) => { setEnrollDialogOpen(open); if (!open) { setSelectedStudentIds([]); setStudentSearch(""); } }}>
        <DialogContent className="sm:max-w-lg max-w-[95vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-accent" />
              Matricular Alunos
            </DialogTitle>
            <DialogDescription>
              Selecione alunos para <span className="font-medium text-foreground">{selectedClass?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar aluno por nome..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Student list */}
            <div className="border rounded-lg divide-y divide-border max-h-[300px] overflow-y-auto">
              {availableStudents && availableStudents.length > 0 ? (
                availableStudents
                  .filter((s) => !studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase()))
                  .map((student) => {
                    const isSelected = selectedStudentIds.includes(student.user_id);
                    return (
                      <button
                        key={student.user_id}
                        type="button"
                        onClick={() => {
                          setSelectedStudentIds((prev) =>
                            isSelected
                              ? prev.filter((id) => id !== student.user_id)
                              : [...prev, student.user_id]
                          );
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-accent/10 ${isSelected ? "bg-accent/5" : ""}`}
                      >
                        <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-accent border-accent text-accent-foreground" : "border-muted-foreground/30"}`}>
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{student.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {student.belt_grade ? `Faixa ${student.belt_grade}` : "Sem faixa"}
                            {student.birth_date && ` · ${differenceInYears(new Date(), new Date(student.birth_date))} anos`}
                          </p>
                        </div>
                        {student.belt_grade && (
                          <BeltBadge grade={student.belt_grade as any} size="sm" />
                        )}
                      </button>
                    );
                  })
              ) : (
                <div className="p-6 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum aluno disponível para matrícula</p>
                </div>
              )}
              {availableStudents && availableStudents.length > 0 && availableStudents.filter((s) => !studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase())).length === 0 && (
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">Nenhum aluno encontrado para "{studentSearch}"</p>
                </div>
              )}
            </div>

            {/* Selection count + actions */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                {selectedStudentIds.length > 0
                  ? `${selectedStudentIds.length} aluno(s) selecionado(s)`
                  : "Selecione ao menos um aluno"}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEnrollDialogOpen(false); setSelectedStudentIds([]); setStudentSearch(""); }}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="bg-accent hover:bg-accent/90"
                  onClick={handleEnrollStudents}
                  disabled={selectedStudentIds.length === 0 || formLoading}
                >
                  {formLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Matricular {selectedStudentIds.length > 0 ? `(${selectedStudentIds.length})` : ""}
                </Button>
              </div>
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

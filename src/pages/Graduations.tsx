import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDojoContext } from "@/hooks/useDojoContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Award, Plus, ChevronRight, History, Loader2, User, GraduationCap, UserX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BeltGrade, BELT_LABELS, BJJ_DEGREE_BELTS, BJJ_BELT_ORDER, JUDO_BELT_ORDER, getBjjBeltLabel } from "@/lib/constants";

type Profile = Tables<"profiles">;
type GraduationHistory = Tables<"graduation_history">;

interface GraduationWithStudent extends GraduationHistory {
  studentName: string;
  promotedByName: string;
}

const MARTIAL_ART_LABELS: Record<string, string> = {
  judo: "Judô",
  bjj: "Jiu-Jitsu",
};

export default function GraduationsPage() {
  const { user, canManageStudents, isAdmin, loading: authLoading } = useAuth();
  const { currentDojoId } = useDojoContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);
  const [selectedMartialArt, setSelectedMartialArt] = useState<string>("judo");
  const [newBelt, setNewBelt] = useState<BeltGrade | "">("");
  const [newDegree, setNewDegree] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Fetch approved students filtered by dojo
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ["approved-students", currentDojoId],
    queryFn: async () => {
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");

      if (roleError) throw roleError;
      if (!roleData || roleData.length === 0) return [];

      const studentIds = roleData.map((r) => r.user_id);

      let query = supabase
        .from("profiles")
        .select("*")
        .in("user_id", studentIds)
        .eq("registration_status", "aprovado")
        .order("name");

      if (currentDojoId) {
        query = query.eq("dojo_id", currentDojoId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!user && (isAdmin || !!currentDojoId),
  });

  // Fetch dojo info for martial_arts config
  const { data: dojoInfo } = useQuery({
    queryKey: ["dojo-info-martial", currentDojoId],
    queryFn: async () => {
      if (!currentDojoId) return null;
      const { data, error } = await supabase
        .from("dojos")
        .select("martial_arts")
        .eq("id", currentDojoId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!currentDojoId,
  });

  // Fetch all student belts for display
  const { data: allStudentBelts = [] } = useQuery({
    queryKey: ["all-student-belts", currentDojoId],
    queryFn: async () => {
      const studentIds = students?.map(s => s.user_id) || [];
      if (studentIds.length === 0) return [];
      const { data, error } = await supabase
        .from("student_belts")
        .select("user_id, martial_art, belt_grade, degree")
        .in("user_id", studentIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!students && students.length > 0,
  });

  const getStudentBelts = (userId: string) => allStudentBelts.filter(b => b.user_id === userId);
  const isMultiArt = dojoInfo?.martial_arts === "judo_bjj";
  const dojoArts = dojoInfo?.martial_arts === "bjj" ? ["bjj"] : dojoInfo?.martial_arts === "judo_bjj" ? ["judo", "bjj"] : ["judo"];

  // Fetch classes filtered by dojo
  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ["classes-active", currentDojoId],
    queryFn: async () => {
      let query = supabase
        .from("classes")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (currentDojoId) {
        query = query.eq("dojo_id", currentDojoId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user && (isAdmin || !!currentDojoId),
  });

  // Fetch class_students enrollments
  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ["class-students-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_students")
        .select("class_id, student_id");
      if (error) throw error;
      return data;
    },
    enabled: !!user && (isAdmin || !!currentDojoId),
  });

  // Group students by class
  const { studentsByClass, studentsWithoutClass } = useMemo(() => {
    if (!students || !enrollments || !classes) {
      return { studentsByClass: new Map<string, Profile[]>(), studentsWithoutClass: [] as Profile[] };
    }

    const enrolledStudentIds = new Set(enrollments.map((e) => e.student_id));
    const classMap = new Map<string, Profile[]>();

    // Initialize all classes
    classes.forEach((c) => classMap.set(c.id, []));

    // Group enrolled students
    enrollments.forEach((enrollment) => {
      const student = students.find((s) => s.user_id === enrollment.student_id);
      if (student) {
        const list = classMap.get(enrollment.class_id);
        // Avoid duplicates
        if (list && !list.find((s) => s.user_id === student.user_id)) {
          list.push(student);
        }
      }
    });

    // Sort each class's students by name
    classMap.forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name)));

    const withoutClass = students
      .filter((s) => !enrolledStudentIds.has(s.user_id))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { studentsByClass: classMap, studentsWithoutClass: withoutClass };
  }, [students, enrollments, classes]);

  // Fetch graduation history
  const { data: graduationHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["graduation-history"],
    queryFn: async () => {
    const { data, error } = await supabase
        .from("graduation_history")
        .select("*")
        .order("graduation_date", { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Batch fetch all needed profiles to avoid N+1
      const allUserIds = [...new Set([
        ...data.map(g => g.student_id),
        ...data.map(g => g.approved_by).filter(Boolean),
      ])];

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", allUserIds);

      const profileMap = new Map<string, string>();
      (profilesData || []).forEach(p => profileMap.set(p.user_id, p.name));

      const enriched: GraduationWithStudent[] = data.map(g => ({
        ...g,
        studentName: profileMap.get(g.student_id) || "Desconhecido",
        promotedByName: g.approved_by ? (profileMap.get(g.approved_by) || "Desconhecido") : "Desconhecido",
      }));

      return enriched;
    },
    enabled: !!user && (isAdmin || !!currentDojoId),
  });

  const getNextBelts = (currentBelt: BeltGrade | null, martialArt?: string, _currentDegree?: number): BeltGrade[] => {
    const order = martialArt === "bjj" ? BJJ_BELT_ORDER : JUDO_BELT_ORDER;
    // Return all belts for the art — each art is independent, so any belt can be assigned
    return order;
  };

  const openPromotionDialog = (student: Profile, martialArt?: string) => {
    setSelectedStudent(student);
    setSelectedMartialArt(martialArt || dojoArts[0] || "judo");
    setNewBelt("");
    setNewDegree(0);
    setNotes("");
    setPromotionDialogOpen(true);
  };

  const handlePromote = async () => {
    if (!selectedStudent || !newBelt || !user) return;

    setFormLoading(true);

    try {
      const martialArt = selectedMartialArt;

      // Get current belt for this art
      const currentBeltForArt = getStudentBelts(selectedStudent.user_id).find(b => b.martial_art === martialArt);

      const { error: historyError } = await supabase.from("graduation_history").insert({
        student_id: selectedStudent.user_id,
        from_belt: currentBeltForArt?.belt_grade || selectedStudent.belt_grade,
        to_belt: newBelt,
        to_degree: martialArt === "bjj" ? newDegree : 0,
        from_degree: currentBeltForArt?.degree || 0,
        approved_by: user.id,
        notes: notes || null,
        graduation_date: new Date().toISOString().split("T")[0],
        martial_art: martialArt,
      });

      if (historyError) throw historyError;

      // Update student_belts table
      const { error: beltError } = await supabase
        .from("student_belts")
        .upsert({
          user_id: selectedStudent.user_id,
          martial_art: martialArt,
          belt_grade: newBelt,
          degree: martialArt === "bjj" ? newDegree : 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,martial_art" });

      if (beltError) throw beltError;

      // Also update profiles.belt_grade as legacy fallback
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ belt_grade: newBelt })
        .eq("user_id", selectedStudent.user_id);

      if (updateError) throw updateError;

      toast({
        title: "Graduação registrada!",
        description: `${selectedStudent.name} foi promovido(a) para ${BELT_LABELS[newBelt]} (${MARTIAL_ART_LABELS[martialArt] || martialArt}).`,
      });

      setPromotionDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["approved-students"] });
      queryClient.invalidateQueries({ queryKey: ["graduation-history"] });
      queryClient.invalidateQueries({ queryKey: ["all-student-belts"] });
      queryClient.invalidateQueries({ queryKey: ["student-belts"] });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao registrar graduação",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const renderStudentCard = (student: Profile) => {
    const belts = getStudentBelts(student.user_id);
    const singleArt = dojoArts.length === 1 ? dojoArts[0] : null;
    const beltForSingleArt = singleArt ? belts.find(b => b.martial_art === singleArt) : null;
    const canPromote = singleArt
      ? getNextBelts(beltForSingleArt?.belt_grade as BeltGrade | null, singleArt, beltForSingleArt?.degree ?? 0).length > 0
      : true;

    return (
      <Card key={student.user_id}>
        <CardHeader className="pb-3 p-4">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <User className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{student.name}</span>
              </CardTitle>
              <CardDescription className="mt-1 text-xs">Faixa atual</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          {/* Show belts per martial art */}
          {(() => {
            const belts = getStudentBelts(student.user_id);
            if (belts.length > 0) {
              return (
                <div className="space-y-1.5">
                  {belts.map((sb) => (
                    <div key={sb.martial_art} className="flex items-center gap-2">
                      <BeltBadge grade={sb.belt_grade} size="sm" showLabel martialArt={sb.martial_art} degree={sb.degree || 0} />
                      <span className="text-xs text-muted-foreground">
                        {MARTIAL_ART_LABELS[sb.martial_art] || sb.martial_art}
                      </span>
                    </div>
                  ))}
                </div>
              );
            }
            return student.belt_grade ? (
              <BeltBadge grade={student.belt_grade} size="sm" showLabel />
            ) : (
              <span className="text-sm text-muted-foreground">Sem faixa</span>
            );
          })()}

          {canManageStudents && isMultiArt ? (
            <div className="flex gap-2">
              {dojoArts.map((art) => {
                const beltForArt = getStudentBelts(student.user_id).find(b => b.martial_art === art);
                const currentBelt = beltForArt?.belt_grade as BeltGrade | null;
                const nextBeltsForArt = getNextBelts(currentBelt, art, beltForArt?.degree ?? 0);
                if (nextBeltsForArt.length === 0) return null;
                return (
                  <Button key={art} className="flex-1" size="sm" variant="outline" onClick={() => openPromotionDialog(student, art)}>
                    <Plus className="h-3 w-3 mr-1" />
                    {MARTIAL_ART_LABELS[art]}
                  </Button>
                );
              })}
            </div>
          ) : canManageStudents && canPromote ? (
            <Button className="w-full" size="sm" onClick={() => openPromotionDialog(student)}>
              <Plus className="h-4 w-4 mr-2" />
              Promover
            </Button>
          ) : canManageStudents ? (
            <Badge variant="secondary" className="w-full justify-center py-2 text-xs">
              Faixa máxima atingida
            </Badge>
          ) : null}
        </CardContent>
      </Card>
    );
  };

  const renderEmptyState = (message: string) => (
    <Card className="text-center py-8">
      <CardContent>
        <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground text-sm">{message}</p>
      </CardContent>
    </Card>
  );

  const isLoading = authLoading || studentsLoading || historyLoading || classesLoading || enrollmentsLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  const classesWithStudents = classes?.filter((c) => {
    const list = studentsByClass.get(c.id);
    return list && list.length > 0;
  }) || [];

  const emptyClasses = classes?.filter((c) => {
    const list = studentsByClass.get(c.id);
    return !list || list.length === 0;
  }) || [];

  // Build tab list: classes with students first, then "sem turma"
  const tabs = [
    ...classesWithStudents.map((c) => ({
      id: c.id,
      label: c.name,
      icon: <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />,
      students: studentsByClass.get(c.id) || [],
    })),
    ...(studentsWithoutClass.length > 0
      ? [
          {
            id: "no-class",
            label: "Sem Turma",
            icon: <UserX className="h-3.5 w-3.5 sm:h-4 sm:w-4" />,
            students: studentsWithoutClass,
          },
        ]
      : []),
  ];

  const defaultTab = tabs.length > 0 ? tabs[0].id : "no-class";

  return (
    <RequireApproval>
      <DashboardLayout>
        <PageHeader title="Graduações" description="Registro de promoções de faixa" />

        {/* Students by Class Tabs */}
        <section className="mb-6 sm:mb-8" data-tour="graduation-form">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-accent" />
            Alunos por Turma
          </h2>

          {tabs.length > 0 ? (
            <Tabs defaultValue={defaultTab}>
              <ScrollArea className="w-full">
                <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 h-auto flex-wrap gap-1 p-1">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="gap-1.5 text-xs sm:text-sm whitespace-nowrap"
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                      <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]">
                        {tab.students.length}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              {tabs.map((tab) => (
                <TabsContent key={tab.id} value={tab.id} className="mt-4">
                  {tab.students.length > 0 ? (
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {tab.students.map(renderStudentCard)}
                    </div>
                  ) : (
                    renderEmptyState("Nenhum aluno nesta turma.")
                  )}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            renderEmptyState("Nenhum aluno aprovado encontrado.")
          )}
        </section>

        {/* Graduation History */}
        <section>
          <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
            <History className="h-5 w-5 text-accent" />
            Histórico de Graduações
          </h2>

          {graduationHistory && graduationHistory.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Aluno</TableHead>
                        <TableHead className="min-w-[140px]">Promoção</TableHead>
                        <TableHead className="hidden sm:table-cell">Data</TableHead>
                        <TableHead className="hidden md:table-cell">Promovido por</TableHead>
                        <TableHead className="hidden lg:table-cell">Notas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {graduationHistory.map((graduation) => (
                        <TableRow key={graduation.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{graduation.studentName}</p>
                              <p className="text-xs text-muted-foreground sm:hidden">
                                {format(new Date(graduation.graduation_date), "dd/MM/yyyy", {
                                  locale: ptBR,
                                })}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {graduation.from_belt ? (
                                <BeltBadge grade={graduation.from_belt} size="sm" />
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                              <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <BeltBadge grade={graduation.to_belt} size="sm" />
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">
                            {format(new Date(graduation.graduation_date), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            {graduation.promotedByName}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {graduation.notes ? (
                              <span className="text-sm text-muted-foreground line-clamp-1">
                                {graduation.notes}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="text-center py-8">
              <CardContent>
                <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground text-sm">Nenhuma graduação registrada ainda.</p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Promotion Dialog */}
        <Dialog open={promotionDialogOpen} onOpenChange={setPromotionDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Promover Aluno</DialogTitle>
              <DialogDescription>
                Registrar promoção de faixa para {selectedStudent?.name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Martial Art selector for multi-art dojos */}
              {isMultiArt && (
                <div className="space-y-2">
                  <Label>Arte Marcial</Label>
                  <div className="flex gap-2">
                    {dojoArts.map((art) => (
                      <button
                        key={art}
                        type="button"
                        onClick={() => { setSelectedMartialArt(art); setNewBelt(""); setNewDegree(0); }}
                        className={cn(
                          "flex-1 py-2 px-3 rounded-md border text-sm font-medium transition-colors",
                          selectedMartialArt === art
                            ? "border-accent bg-accent/10 text-foreground"
                            : "border-border hover:bg-muted text-muted-foreground"
                        )}
                      >
                        {MARTIAL_ART_LABELS[art]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm text-muted-foreground">Faixa Atual ({MARTIAL_ART_LABELS[selectedMartialArt] || selectedMartialArt})</Label>
                <div className="mt-1">
                  {(() => {
                    const currentBelt = selectedStudent ? getStudentBelts(selectedStudent.user_id).find(b => b.martial_art === selectedMartialArt) : null;
                    if (currentBelt) {
                      return <BeltBadge grade={currentBelt.belt_grade} size="md" showLabel martialArt={currentBelt.martial_art} degree={currentBelt.degree || 0} />;
                    }
                    return <span className="text-sm text-muted-foreground">Sem faixa nesta arte</span>;
                  })()}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-belt">Nova Faixa</Label>
                <Select value={newBelt} onValueChange={(v) => {
                  const belt = v as BeltGrade;
                  setNewBelt(belt);
                  // Auto-set minimum degree for same-belt BJJ promotions
                  if (selectedMartialArt === "bjj" && selectedStudent) {
                    const currentBeltData = getStudentBelts(selectedStudent.user_id).find(b => b.martial_art === selectedMartialArt);
                    if (currentBeltData?.belt_grade === belt) {
                      setNewDegree((currentBeltData?.degree ?? 0) + 1);
                    } else {
                      setNewDegree(0);
                    }
                  } else {
                    setNewDegree(0);
                  }
                }}>
                  <SelectTrigger id="new-belt">
                    <SelectValue placeholder="Selecionar nova faixa" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedStudent &&
                      (() => {
                        const currentBelt = getStudentBelts(selectedStudent.user_id).find(b => b.martial_art === selectedMartialArt);
                        return getNextBelts(currentBelt?.belt_grade as BeltGrade | null, selectedMartialArt, currentBelt?.degree ?? 0);
                      })().map((belt) => (
                        <SelectItem key={belt} value={belt}>
                          <div className="flex items-center gap-2">
                            <BeltBadge grade={belt} size="sm" />
                            <span>{BELT_LABELS[belt]}</span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* BJJ Degree selector */}
              {newBelt && selectedMartialArt === "bjj" && BJJ_DEGREE_BELTS.includes(newBelt) && (
                <div className="space-y-2">
                  <Label>Grau (listras BJJ)</Label>
                  <div className="flex gap-2">
                    {(() => {
                      const currentBeltData = selectedStudent ? getStudentBelts(selectedStudent.user_id).find(b => b.martial_art === selectedMartialArt) : null;
                      const isSameBelt = currentBeltData?.belt_grade === newBelt;
                      const minDegree = isSameBelt ? (currentBeltData?.degree ?? 0) + 1 : 0;
                      const degrees = [0, 1, 2, 3, 4].filter(d => d >= minDegree);
                      return degrees.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setNewDegree(d)}
                          className={cn(
                            "flex-1 flex flex-col items-center gap-1.5 p-2 rounded-md border transition-colors",
                            newDegree === d
                              ? "border-accent bg-accent/10 text-foreground"
                              : "border-border hover:bg-muted text-muted-foreground"
                          )}
                        >
                          <BeltBadge grade={newBelt} size="sm" martialArt="bjj" degree={d} />
                          <span className="text-xs">{d}º</span>
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {newBelt && (
                <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                  <Label className="text-sm text-muted-foreground">Promoção ({MARTIAL_ART_LABELS[selectedMartialArt]})</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {(() => {
                     const currentBelt = selectedStudent ? getStudentBelts(selectedStudent.user_id).find(b => b.martial_art === selectedMartialArt) : null;
                      if (currentBelt) {
                        return <BeltBadge grade={currentBelt.belt_grade} size="sm" martialArt={currentBelt.martial_art} degree={currentBelt.degree || 0} />;
                      }
                      return <span className="text-xs text-muted-foreground">Nova</span>;
                    })()}
                    <ChevronRight className="h-4 w-4 text-accent" />
                    <BeltBadge grade={newBelt} size="sm" showLabel martialArt={selectedMartialArt} degree={newDegree} />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Exame de graduação, competição, etc."
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPromotionDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handlePromote} disabled={!newBelt || formLoading}>
                  {formLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Award className="mr-2 h-4 w-4" />
                      Confirmar Promoção
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </RequireApproval>
  );
}

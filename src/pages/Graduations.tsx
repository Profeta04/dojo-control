import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
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
  DialogTrigger,
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
import { Award, Plus, ChevronRight, History, Loader2, User } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BeltGrade, BELT_LABELS } from "@/lib/constants";

type Profile = Tables<"profiles">;
type GraduationHistory = Tables<"graduation_history">;

interface GraduationWithStudent extends GraduationHistory {
  studentName: string;
  promotedByName: string;
}

const BELT_ORDER: BeltGrade[] = [
  "branca",
  "cinza",
  "azul",
  "amarela",
  "laranja",
  "verde",
  "roxa",
  "marrom",
  "preta_1dan",
  "preta_2dan",
  "preta_3dan",
  "preta_4dan",
  "preta_5dan",
  "preta_6dan",
  "preta_7dan",
  "preta_8dan",
  "preta_9dan",
  "preta_10dan",
];

export default function GraduationsPage() {
  const { user, canManageStudents, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);
  const [newBelt, setNewBelt] = useState<BeltGrade | "">("");
  const [notes, setNotes] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Fetch approved students
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ["approved-students"],
    queryFn: async () => {
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "student");

      if (roleError) throw roleError;
      if (!roleData || roleData.length === 0) return [];

      const studentIds = roleData.map((r) => r.user_id);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", studentIds)
        .eq("registration_status", "aprovado")
        .order("name");

      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!user,
  });

  // Fetch graduation history
  const { data: graduationHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["graduation-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("graduation_history")
        .select("*")
        .order("graduation_date", { ascending: false });

      if (error) throw error;
      
      // Enrich with names
      const enriched: GraduationWithStudent[] = await Promise.all(
        (data || []).map(async (g) => {
          const { data: studentProfile } = await supabase
            .from("profiles")
            .select("name")
            .eq("user_id", g.student_id)
            .single();

          const { data: promoterProfile } = await supabase
            .from("profiles")
            .select("name")
            .eq("user_id", g.approved_by)
            .single();

          return {
            ...g,
            studentName: studentProfile?.name || "Desconhecido",
            promotedByName: promoterProfile?.name || "Desconhecido",
          };
        })
      );

      return enriched;
    },
    enabled: !!user,
  });

  const getNextBelts = (currentBelt: BeltGrade | null): BeltGrade[] => {
    if (!currentBelt) return BELT_ORDER;
    const currentIndex = BELT_ORDER.indexOf(currentBelt);
    if (currentIndex === -1) return BELT_ORDER;
    return BELT_ORDER.slice(currentIndex + 1);
  };

  const openPromotionDialog = (student: Profile) => {
    setSelectedStudent(student);
    setNewBelt("");
    setNotes("");
    setPromotionDialogOpen(true);
  };

  const handlePromote = async () => {
    if (!selectedStudent || !newBelt || !user) return;

    setFormLoading(true);

    try {
      // Insert graduation history
      const { error: historyError } = await supabase.from("graduation_history").insert({
        student_id: selectedStudent.user_id,
        from_belt: selectedStudent.belt_grade,
        to_belt: newBelt,
        approved_by: user.id,
        notes: notes || null,
        graduation_date: new Date().toISOString().split('T')[0],
      });

      if (historyError) throw historyError;

      // Update student's current belt
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ belt_grade: newBelt })
        .eq("user_id", selectedStudent.user_id);

      if (updateError) throw updateError;

      toast({
        title: "Graduação registrada!",
        description: `${selectedStudent.name} foi promovido(a) para ${BELT_LABELS[newBelt]}.`,
      });

      setPromotionDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["approved-students"] });
      queryClient.invalidateQueries({ queryKey: ["graduation-history"] });
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

  if (authLoading || studentsLoading || historyLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  return (
    <RequireApproval>
    <DashboardLayout>
      <PageHeader title="Graduações" description="Registro de promoções de faixa" />

      {/* Students for Promotion */}
      {canManageStudents && (
        <section className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-accent" />
            Promover Aluno
          </h2>
          
          {students && students.length > 0 ? (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {students.map((student) => {
                const nextBelts = getNextBelts(student.belt_grade as BeltGrade | null);
                const canPromote = nextBelts.length > 0;

                return (
                  <Card key={student.user_id}>
                    <CardHeader className="pb-3 p-4">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                            <User className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{student.name}</span>
                          </CardTitle>
                          <CardDescription className="mt-1 text-xs">
                            Faixa atual
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 p-4 pt-0">
                      <div className="flex items-center gap-2">
                        {student.belt_grade ? (
                          <BeltBadge grade={student.belt_grade} size="sm" showLabel />
                        ) : (
                          <span className="text-sm text-muted-foreground">Sem faixa</span>
                        )}
                      </div>

                      {canPromote ? (
                        <Button
                          className="w-full"
                          size="sm"
                          onClick={() => openPromotionDialog(student)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Promover
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="w-full justify-center py-2 text-xs">
                          Faixa máxima atingida
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="text-center py-8">
              <CardContent>
                <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground text-sm">Nenhum aluno aprovado encontrado.</p>
              </CardContent>
            </Card>
          )}
        </section>
      )}

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
                              {format(new Date(graduation.graduation_date), "dd/MM/yyyy", { locale: ptBR })}
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
                          {format(new Date(graduation.graduation_date), "dd/MM/yyyy", { locale: ptBR })}
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
            {/* Current Belt */}
            <div>
              <Label className="text-sm text-muted-foreground">Faixa Atual</Label>
              <div className="mt-1">
                {selectedStudent?.belt_grade ? (
                  <BeltBadge grade={selectedStudent.belt_grade} size="md" showLabel />
                ) : (
                  <span className="text-sm">Sem faixa</span>
                )}
              </div>
            </div>

            {/* New Belt Selection */}
            <div className="space-y-2">
              <Label htmlFor="new-belt">Nova Faixa</Label>
              <Select value={newBelt} onValueChange={(v) => setNewBelt(v as BeltGrade)}>
                <SelectTrigger id="new-belt">
                  <SelectValue placeholder="Selecionar nova faixa" />
                </SelectTrigger>
                <SelectContent>
                  {selectedStudent &&
                    getNextBelts(selectedStudent.belt_grade as BeltGrade | null).map((belt) => (
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

            {/* Preview */}
            {newBelt && (
              <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                <Label className="text-sm text-muted-foreground">Promoção</Label>
                <div className="flex items-center gap-2 mt-1">
                  {selectedStudent?.belt_grade ? (
                    <BeltBadge grade={selectedStudent.belt_grade} size="sm" />
                  ) : (
                    <span className="text-xs">—</span>
                  )}
                  <ChevronRight className="h-4 w-4 text-accent" />
                  <BeltBadge grade={newBelt} size="sm" showLabel />
                </div>
              </div>
            )}

            {/* Notes */}
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

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPromotionDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handlePromote}
                disabled={!newBelt || formLoading}
              >
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

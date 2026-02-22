import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDojoContext } from "@/hooks/useDojoContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { RegistrationStatusBadge } from "@/components/shared/StatusBadge";
import { StudentReportDialog } from "@/components/students/StudentReportDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useToast } from "@/hooks/use-toast";
import { Users, UserCheck, UserX, Clock, Mail, Loader2, ShieldCheck, ChevronDown, ChevronUp, Building, Shield, GraduationCap, MoreHorizontal, Ban, Trash2, Edit, Unlock } from "lucide-react";
import { BELT_LABELS, BeltGrade } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tables } from "@/integrations/supabase/types";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Profile = Tables<"profiles"> | any;

interface GuardianWithMinors {
  guardian: Profile;
  minors: Profile[];
}

export default function Students() {
  const navigate = useNavigate();
  const { user, canManageStudents, loading: authLoading } = useAuth();
  const { currentDojoId } = useDojoContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedGuardians, setExpandedGuardians] = useState<Set<string>>(new Set());
  const [scholarshipConfirm, setScholarshipConfirm] = useState<Profile | null>(null);
  const [approvalBelts, setApprovalBelts] = useState<{ martial_art: string; belt_grade: BeltGrade }[]>([]);
  const [loadingBelts, setLoadingBelts] = useState(false);

  // Student management dialogs
  const [editStudent, setEditStudent] = useState<Profile | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBelt, setEditBelt] = useState<BeltGrade>("branca");

  const [blockStudent, setBlockStudent] = useState<Profile | null>(null);
  const [blockReason, setBlockReason] = useState("");

  const [deleteStudent, setDeleteStudent] = useState<Profile | null>(null);

  const { data: students, isLoading } = useQuery({
    queryKey: ["students", currentDojoId],
    queryFn: async () => {
      // Get all users with sensei role (to exclude them)
      const { data: senseiRoles } = await (supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "sensei") as any);

      const senseiUserIds = senseiRoles?.map((r: any) => r.user_id) || [];

      // Get all users with admin role (to exclude them)
      const { data: adminRoles } = await (supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin") as any);

      const adminUserIds = adminRoles?.map((r: any) => r.user_id) || [];

      // Get all guardians (users who have minors linked to them)
      const { data: guardianProfiles } = await (supabase
        .from("profiles")
        .select("guardian_user_id")
        .not("guardian_user_id", "is", null) as any);

      const guardianUserIds = [...new Set((guardianProfiles || []).map((p: any) => p.guardian_user_id).filter(Boolean) || [])];

      // Exclude senseis, admins, and guardians
      const excludeIds = [...senseiUserIds, ...adminUserIds, ...guardianUserIds] as string[];

      // Get all profiles that are students (not admins, senseis, or guardians)
      let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }) as any;

      // Exclude senseis, admins, and guardians
      if (excludeIds.length > 0) {
        query = query.not("user_id", "in", `(${excludeIds.join(",")})`);
      }

      // Filter by dojo if selected
      if (currentDojoId) {
        query = query.eq("dojo_id", currentDojoId);
      }

      const { data: profiles } = await query;

      return profiles || [];
    },
    enabled: !!user && canManageStudents,
  });

  // Fetch guardians with their minors
  const { data: guardiansWithMinors, isLoading: isLoadingGuardians } = useQuery({
    queryKey: ["guardians-with-minors", currentDojoId],
    queryFn: async () => {
      // Get all profiles that have a guardian (minors)
      let minorQuery = supabase
        .from("profiles")
        .select("*")
        .not("guardian_user_id", "is", null) as any;

      if (currentDojoId) {
        minorQuery = minorQuery.eq("dojo_id", currentDojoId);
      }

      const { data: minorProfiles } = await minorQuery;

      if (!minorProfiles || minorProfiles.length === 0) return [];

      // Get unique guardian user IDs
      const guardianUserIds = [...new Set(minorProfiles.map((p: any) => p.guardian_user_id).filter(Boolean))] as string[];

      // Fetch guardian profiles
      const { data: guardianProfiles } = await (supabase
        .from("profiles")
        .select("*")
        .in("user_id", guardianUserIds) as any);

      if (!guardianProfiles) return [];

      // Group minors by guardian
      const guardiansMap = new Map<string, GuardianWithMinors>();
      
      for (const guardian of guardianProfiles) {
        guardiansMap.set(guardian.user_id, {
          guardian,
          minors: minorProfiles.filter((m: any) => m.guardian_user_id === guardian.user_id),
        });
      }

      return Array.from(guardiansMap.values());
    },
    enabled: !!user && canManageStudents,
  });

  // Redirect if not authorized (after all hooks)
  if (!authLoading && !canManageStudents) {
    navigate("/dashboard");
    return null;
  }

  const fetchStudentBelts = async (studentId: string) => {
    setLoadingBelts(true);
    try {
      const { data } = await supabase
        .from("student_belts")
        .select("martial_art, belt_grade")
        .eq("user_id", studentId);
      if (data && data.length > 0) {
        setApprovalBelts(data.map((b: any) => ({ martial_art: b.martial_art, belt_grade: b.belt_grade as BeltGrade })));
      } else {
        // Fallback: use profile belt_grade
        const student = students?.find((s) => s.user_id === studentId);
        setApprovalBelts([{ martial_art: "judo", belt_grade: (student?.belt_grade as BeltGrade) || "branca" }]);
      }
    } catch {
      setApprovalBelts([{ martial_art: "judo", belt_grade: "branca" }]);
    } finally {
      setLoadingBelts(false);
    }
  };

  const MARTIAL_ART_LABELS: Record<string, string> = {
    judo: "Judô",
    bjj: "Jiu-Jitsu",
  };

  const handleApprove = async () => {
    if (!selectedStudent) return;
    setActionLoading(true);

    try {
      // Use the first belt as profile belt_grade
      const primaryBelt = approvalBelts[0]?.belt_grade || "branca";

      // Update profile status
      await (supabase
        .from("profiles")
        .update({
          registration_status: "aprovado",
          approved_at: new Date().toISOString(),
          approved_by: user!.id,
          belt_grade: primaryBelt,
        } as any)
        .eq("user_id", selectedStudent.user_id) as any);

      // Update each student_belt record
      for (const belt of approvalBelts) {
        await supabase
          .from("student_belts")
          .update({ belt_grade: belt.belt_grade } as any)
          .eq("user_id", selectedStudent.user_id)
          .eq("martial_art", belt.martial_art);
      }

      // Assign student role
      await supabase.rpc("assign_user_role", {
        _user_id: selectedStudent.user_id,
        _role: "student",
      });

      // Send push notification to the approved student
      supabase.functions.invoke("send-push-notification", {
        body: {
          userId: selectedStudent.user_id,
          title: "🎉 Cadastro Aprovado!",
          body: `Bem-vindo ao dojo, ${selectedStudent.name}! Seu cadastro foi aprovado. Vamos treinar!`,
          url: "/dashboard",
        },
      }).catch(() => {}); // fire-and-forget

      // In-app notification for the student (fire-and-forget)
      void supabase.from("notifications").insert({
        user_id: selectedStudent.user_id,
        title: "🎉 Cadastro Aprovado!",
        message: `Seu cadastro foi aprovado! Bem-vindo ao dojo.`,
        type: "info",
      });

      toast({
        title: "Aluno aprovado!",
        description: `${selectedStudent.name} foi aprovado com sucesso.`,
      });

      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao aprovar aluno",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
      setSelectedStudent(null);
      setActionType(null);
    }
  };

  const handleReject = async () => {
    if (!selectedStudent) return;
    setActionLoading(true);

    try {
      await supabase
        .from("profiles")
        .update({
          registration_status: "rejeitado",
        })
        .eq("user_id", selectedStudent.user_id);

      toast({
        title: "Cadastro rejeitado",
        description: `O cadastro de ${selectedStudent.name} foi rejeitado.`,
      });

      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao rejeitar cadastro",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
      setSelectedStudent(null);
      setActionType(null);
    }
  };

  const toggleGuardianExpanded = (guardianId: string) => {
    setExpandedGuardians((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(guardianId)) {
        newSet.delete(guardianId);
      } else {
        newSet.add(guardianId);
      }
      return newSet;
    });
  };

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  const pendingStudents = students?.filter((s) => s.registration_status === "pendente") || [];
  const approvedStudents = students?.filter((s) => s.registration_status === "aprovado") || [];
  const rejectedStudents = students?.filter((s) => s.registration_status === "rejeitado") || [];

  const handleToggleFederated = async (student: Profile) => {
    const newValue = !student.is_federated;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_federated: newValue } as any)
        .eq("user_id", student.user_id);
      
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast({
        title: newValue ? "Aluno federado" : "Federação removida",
        description: `${student.name} foi ${newValue ? "marcado como federado" : "desmarcado"}.`,
      });
    } catch {
      toast({ title: "Erro", description: "Erro ao atualizar status", variant: "destructive" });
    }
  };


  const handleToggleScholarship = async (student: Profile, cancelPending: boolean = false) => {
    const newValue = !student.is_scholarship;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_scholarship: newValue } as any)
        .eq("user_id", student.user_id);
      
      if (error) throw error;

      // If marking as scholarship and user chose to cancel pending payments
      if (newValue && cancelPending) {
        await supabase
          .from("payments")
          .delete()
          .eq("student_id", student.user_id)
          .eq("status", "pendente")
          .eq("category", "mensalidade");
      }

      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({
        title: newValue ? "Aluno marcado como bolsista" : "Bolsa removida",
        description: `${student.name} ${newValue ? "não receberá mensalidades programadas" : "voltará a receber mensalidades"}.`,
      });
    } catch {
      toast({ title: "Erro", description: "Erro ao atualizar status", variant: "destructive" });
    } finally {
      setScholarshipConfirm(null);
    }
  };

  const handleScholarshipToggleClick = async (student: Profile) => {
    if (!student.is_scholarship) {
      // Turning ON scholarship — check for pending payments
      const { data: pendingPayments } = await supabase
        .from("payments")
        .select("id")
        .eq("student_id", student.user_id)
        .eq("status", "pendente")
        .eq("category", "mensalidade");

      if (pendingPayments && pendingPayments.length > 0) {
        setScholarshipConfirm(student);
        return;
      }
    }
    handleToggleScholarship(student, false);
  };

  const handleEditStudent = async () => {
    if (!editStudent) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ name: editName, phone: editPhone, belt_grade: editBelt } as any)
        .eq("user_id", editStudent.user_id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast({ title: "Aluno atualizado", description: `${editName} foi atualizado com sucesso.` });
    } catch {
      toast({ title: "Erro", description: "Erro ao atualizar aluno", variant: "destructive" });
    } finally {
      setActionLoading(false);
      setEditStudent(null);
    }
  };

  const handleBlockStudent = async () => {
    if (!blockStudent) return;
    setActionLoading(true);
    const isCurrentlyBlocked = blockStudent.is_blocked;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_blocked: !isCurrentlyBlocked,
          blocked_reason: isCurrentlyBlocked ? null : (blockReason || "Bloqueado pelo administrador"),
        } as any)
        .eq("user_id", blockStudent.user_id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast({
        title: isCurrentlyBlocked ? "Aluno desbloqueado" : "Aluno bloqueado",
        description: `${blockStudent.name} foi ${isCurrentlyBlocked ? "desbloqueado" : "bloqueado"}.`,
      });
    } catch {
      toast({ title: "Erro", description: "Erro ao atualizar status", variant: "destructive" });
    } finally {
      setActionLoading(false);
      setBlockStudent(null);
      setBlockReason("");
    }
  };

  const handleDeleteStudent = async () => {
    if (!deleteStudent) return;
    setActionLoading(true);
    try {
      // Soft delete: set status to 'rejeitado' and remove student role
      await supabase
        .from("profiles")
        .update({ registration_status: "rejeitado" } as any)
        .eq("user_id", deleteStudent.user_id);
      await supabase.rpc("remove_user_role", { _user_id: deleteStudent.user_id, _role: "student" });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast({ title: "Aluno removido", description: `${deleteStudent.name} foi removido do sistema.` });
    } catch {
      toast({ title: "Erro", description: "Erro ao remover aluno", variant: "destructive" });
    } finally {
      setActionLoading(false);
      setDeleteStudent(null);
    }
  };

  const StudentTable = ({ data, showActions = false, showManage = false }: { data: Profile[]; showActions?: boolean; showManage?: boolean }) => (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[120px]">Nome</TableHead>
            <TableHead className="hidden sm:table-cell">Email</TableHead>
            <TableHead>Faixa</TableHead>
            <TableHead className="hidden md:table-cell">Federado</TableHead>
            <TableHead className="hidden md:table-cell">Bolsista</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            {(showActions || showManage) && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((student) => (
            <TableRow key={student.user_id} className={student.is_blocked ? "opacity-60" : ""}>
              <TableCell>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium">{student.name}</p>
                    {student.is_blocked && (
                      <Ban className="h-3.5 w-3.5 text-destructive" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground sm:hidden">{student.email}</p>
                  <div className="sm:hidden mt-1">
                    <RegistrationStatusBadge status={student.registration_status || "pendente"} />
                  </div>
                  <div className="md:hidden flex items-center gap-3 mt-1.5">
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Switch
                        checked={student.is_federated ?? false}
                        onCheckedChange={() => handleToggleFederated(student)}
                        aria-label={`Federado`}
                        className="scale-75 origin-left"
                      />
                      {student.is_federated ? <Shield className="h-3 w-3 text-primary" /> : null}
                      Fed.
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Switch
                        checked={student.is_scholarship ?? false}
                        onCheckedChange={() => handleScholarshipToggleClick(student)}
                        aria-label={`Bolsista`}
                        className="scale-75 origin-left"
                      />
                      {student.is_scholarship ? <GraduationCap className="h-3 w-3 text-accent-foreground" /> : null}
                      Bolsa
                    </label>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <Mail className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate max-w-[180px]">{student.email}</span>
                </div>
              </TableCell>
              <TableCell>
                {student.belt_grade ? (
                  <BeltBadge grade={student.belt_grade} size="sm" />
                ) : (
                  <span className="text-muted-foreground text-sm">Branca</span>
                )}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={student.is_federated ?? false}
                    onCheckedChange={() => handleToggleFederated(student)}
                    aria-label={`Marcar ${student.name} como federado`}
                  />
                  {student.is_federated && (
                    <Shield className="h-4 w-4 text-primary" />
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={student.is_scholarship ?? false}
                    onCheckedChange={() => handleScholarshipToggleClick(student)}
                    aria-label={`Marcar ${student.name} como bolsista`}
                  />
                  {student.is_scholarship && (
                    <Badge variant="outline" className="text-xs gap-1 border-accent text-accent-foreground">
                      <GraduationCap className="h-3 w-3" />
                      Bolsista
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {student.is_blocked && (
                  <Badge variant="destructive" className="text-xs">Bloqueado</Badge>
                )}
              </TableCell>
              {showActions && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 sm:gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-success hover:text-success/80 hover:bg-success/10 h-8 px-2 sm:px-3"
                      onClick={() => {
                        setSelectedStudent(student);
                        fetchStudentBelts(student.user_id);
                        setActionType("approve");
                      }}
                    >
                      <UserCheck className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Aprovar</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 h-8 px-2 sm:px-3"
                      onClick={() => {
                        setSelectedStudent(student);
                        setActionType("reject");
                      }}
                    >
                      <UserX className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Rejeitar</span>
                    </Button>
                  </div>
                </TableCell>
              )}
              {showManage && (
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setEditStudent(student);
                        setEditName(student.name);
                        setEditPhone(student.phone || "");
                        setEditBelt((student.belt_grade as BeltGrade) || "branca");
                      }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setBlockStudent(student);
                        setBlockReason(student.blocked_reason || "");
                      }}>
                        {student.is_blocked ? (
                          <><Unlock className="h-4 w-4 mr-2" />Desbloquear</>
                        ) : (
                          <><Ban className="h-4 w-4 mr-2" />Bloquear</>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteStudent(student)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir do sistema
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-8 text-muted-foreground">
      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>{message}</p>
    </div>
  );

  return (
    <RequireApproval>
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Alunos"
          description="Gerencie os alunos do dojo"
        />
        <StudentReportDialog />
      </div>

      <Tabs defaultValue="pending" className="mt-6">
        <TabsList className="flex-wrap">
        <TabsTrigger value="pending" className="gap-1.5 text-xs sm:text-sm">
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Pendentes</span>
            <span className="sm:hidden">Pend.</span>
            {pendingStudents.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-warning/20 text-warning-foreground rounded-full text-xs">
                {pendingStudents.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-1.5 text-xs sm:text-sm">
            <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Aprovados ({approvedStudents.length})</span>
            <span className="sm:hidden">Aprov. ({approvedStudents.length})</span>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-1.5 text-xs sm:text-sm">
            <UserX className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Rejeitados ({rejectedStudents.length})</span>
            <span className="sm:hidden">Rej. ({rejectedStudents.length})</span>
          </TabsTrigger>
          <TabsTrigger value="guardians" className="gap-1.5 text-xs sm:text-sm">
            <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Responsáveis ({guardiansWithMinors?.length || 0})</span>
            <span className="sm:hidden">Resp. ({guardiansWithMinors?.length || 0})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                Cadastros Pendentes de Aprovação
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingStudents.length > 0 ? (
                <StudentTable data={pendingStudents} showActions />
              ) : (
                <EmptyState message="Nenhum cadastro pendente de aprovação." />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-success" />
                Alunos Aprovados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {approvedStudents.length > 0 ? (
                <StudentTable data={approvedStudents} showManage />
              ) : (
                <EmptyState message="Nenhum aluno aprovado ainda." />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-destructive" />
                Cadastros Rejeitados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rejectedStudents.length > 0 ? (
                <StudentTable data={rejectedStudents} />
              ) : (
                <EmptyState message="Nenhum cadastro rejeitado." />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guardians">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Responsáveis e Dependentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingGuardians ? (
                <LoadingSpinner />
              ) : guardiansWithMinors && guardiansWithMinors.length > 0 ? (
                <div className="space-y-3">
                  {guardiansWithMinors.map(({ guardian, minors }) => {
                    const isExpanded = expandedGuardians.has(guardian.user_id);
                    return (
                      <Card key={guardian.user_id} className="border-border/50 overflow-hidden">
                        <div
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => toggleGuardianExpanded(guardian.user_id)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <ShieldCheck className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{guardian.name}</p>
                              <p className="text-sm text-muted-foreground truncate">{guardian.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                              {minors.length} dep.
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t bg-muted/20">
                            <p className="text-xs font-medium text-muted-foreground py-3">Dependentes:</p>
                            <div className="space-y-2">
                              {minors.map((minor) => (
                                <div
                                  key={minor.user_id}
                                  className="flex items-center justify-between p-3 bg-background rounded-lg border border-border/50"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <div className="min-w-0">
                                      <p className="font-medium text-sm truncate">{minor.name}</p>
                                      <p className="text-xs text-muted-foreground truncate">{minor.email}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {minor.belt_grade && <BeltBadge grade={minor.belt_grade as any} size="sm" />}
                                    <RegistrationStatusBadge status={(minor.registration_status || "pendente") as any} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <EmptyState message="Nenhum responsável cadastrado." />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!actionType} onOpenChange={() => { setActionType(null); setSelectedStudent(null); setApprovalBelts([]); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "approve" ? "Aprovar Aluno" : "Rejeitar Cadastro"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "approve"
                ? `Tem certeza que deseja aprovar o cadastro de ${selectedStudent?.name}? O aluno poderá acessar o sistema.`
                : `Tem certeza que deseja rejeitar o cadastro de ${selectedStudent?.name}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Belt selector - only on approve */}
          {actionType === "approve" && (
            <div className="space-y-3 py-2">
              <label className="text-sm font-medium">Confirmação de Faixa(s)</label>
              {loadingBelts ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando faixas...
                </div>
              ) : approvalBelts.length > 0 ? (
                approvalBelts.map((belt, idx) => (
                  <div key={belt.martial_art} className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      🥋 {MARTIAL_ART_LABELS[belt.martial_art] || belt.martial_art}
                    </label>
                    <Select
                      value={belt.belt_grade}
                      onValueChange={(v) => {
                        setApprovalBelts((prev) =>
                          prev.map((b, i) => i === idx ? { ...b, belt_grade: v as BeltGrade } : b)
                        );
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(BELT_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">Nenhuma faixa registrada.</p>
              )}
              <p className="text-xs text-muted-foreground">
                Confirme a(s) faixa(s) do aluno antes de aprovar.
              </p>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={actionType === "approve" ? handleApprove : handleReject}
              className={actionType === "approve" ? "bg-success hover:bg-success/90 text-success-foreground" : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {actionType === "approve" ? "Aprovar" : "Rejeitar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Scholarship Confirmation Dialog */}
      <AlertDialog open={!!scholarshipConfirm} onOpenChange={(open) => { if (!open) setScholarshipConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como bolsista</AlertDialogTitle>
            <AlertDialogDescription>
              {scholarshipConfirm?.name} possui mensalidades pendentes. Deseja cancelá-las ao marcá-lo como bolsista?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => scholarshipConfirm && handleToggleScholarship(scholarshipConfirm, false)}
            >
              Manter pendentes
            </Button>
            <AlertDialogAction
              onClick={() => scholarshipConfirm && handleToggleScholarship(scholarshipConfirm, true)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancelar pendentes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Student Dialog */}
      <Dialog open={!!editStudent} onOpenChange={(open) => { if (!open) setEditStudent(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Aluno</DialogTitle>
            <DialogDescription>Atualize as informações do aluno.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-2">
              <Label>Faixa</Label>
              <Select value={editBelt} onValueChange={(v) => setEditBelt(v as BeltGrade)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BELT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStudent(null)}>Cancelar</Button>
            <Button onClick={handleEditStudent} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Student Dialog */}
      <AlertDialog open={!!blockStudent} onOpenChange={(open) => { if (!open) { setBlockStudent(null); setBlockReason(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {blockStudent?.is_blocked ? "Desbloquear Aluno" : "Bloquear Aluno"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {blockStudent?.is_blocked
                ? `Deseja desbloquear ${blockStudent?.name}? O aluno poderá acessar o sistema novamente.`
                : `Deseja bloquear ${blockStudent?.name}? O aluno não poderá acessar o sistema.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!blockStudent?.is_blocked && (
            <div className="space-y-2 py-2">
              <Label>Motivo do bloqueio (opcional)</Label>
              <Textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Ex: Inadimplência, indisciplina..."
                rows={2}
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlockStudent}
              disabled={actionLoading}
              className={blockStudent?.is_blocked ? "bg-success hover:bg-success/90 text-success-foreground" : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"}
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {blockStudent?.is_blocked ? "Desbloquear" : "Bloquear"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Student Dialog */}
      <AlertDialog open={!!deleteStudent} onOpenChange={(open) => { if (!open) setDeleteStudent(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Aluno</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {deleteStudent?.name} do sistema? O aluno será movido para a aba de rejeitados e perderá o acesso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStudent}
              disabled={actionLoading}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
    </RequireApproval>
  );
}
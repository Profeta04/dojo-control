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
import { StudentTable } from "@/components/students/StudentTable";
import {
  ApprovalDialog,
  ScholarshipDialog,
  EditStudentDialog,
  BlockStudentDialog,
  DeleteStudentDialog,
  EnrollmentDialog,
  CrossArtBeltDialog,
  ResetPasswordDialog,
  GuardianInfoDialog,
} from "@/components/students/StudentDialogs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Users, UserCheck, UserX, Clock, Ban, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { BeltGrade } from "@/lib/constants";
import { Tables } from "@/integrations/supabase/types";
import { batchedInQuery } from "@/lib/batchedQuery";

type Profile = Tables<"profiles">;

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

  // Dialog state
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedGuardians, setExpandedGuardians] = useState<Set<string>>(new Set());
  const [scholarshipConfirm, setScholarshipConfirm] = useState<Profile | null>(null);
  const [approvalBelts, setApprovalBelts] = useState<{ martial_art: string; belt_grade: BeltGrade }[]>([]);
  const [loadingBelts, setLoadingBelts] = useState(false);

  // Edit student
  const [editStudent, setEditStudent] = useState<Profile | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBelt, setEditBelt] = useState<BeltGrade>("branca");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editStudentBelts, setEditStudentBelts] = useState<{ martial_art: string; belt_grade: string; id?: string }[]>([]);
  const [editGuardianName, setEditGuardianName] = useState("");
  const [editGuardianPhone, setEditGuardianPhone] = useState("");
  const [editGuardianEmail, setEditGuardianEmail] = useState("");

  // Other dialogs
  const [blockStudent, setBlockStudent] = useState<Profile | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [deleteStudent, setDeleteStudent] = useState<Profile | null>(null);
  const [permanentDeleteStudent, setPermanentDeleteStudent] = useState<Profile | null>(null);
  const [enrollStudent, setEnrollStudent] = useState<Profile | null>(null);
  const [availableClasses, setAvailableClasses] = useState<{ id: string; name: string; martial_art: string }[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [crossArtDialog, setCrossArtDialog] = useState<{ student: Profile; missingArts: string[] } | null>(null);
  const [crossArtBelts, setCrossArtBelts] = useState<Record<string, BeltGrade>>({});
  const [resetPwStudent, setResetPwStudent] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [guardianInfoStudent, setGuardianInfoStudent] = useState<Profile | null>(null);
  const [guardianProfile, setGuardianProfile] = useState<Profile | null>(null);
  const [guardianLoading, setGuardianLoading] = useState(false);

  // ─── Data queries ────────────────────────────────────────
  const { data: dojoInfo } = useQuery({
    queryKey: ["dojo-info", currentDojoId],
    queryFn: async () => {
      if (!currentDojoId) return null;
      const { data } = await supabase.from("dojos").select("martial_arts").eq("id", currentDojoId).single();
      return data;
    },
    enabled: !!currentDojoId,
  });

  const isMultiArt = dojoInfo?.martial_arts === "judo_bjj";

  const { data: students, isLoading } = useQuery({
    queryKey: ["students", currentDojoId],
    queryFn: async () => {
      const { data: staffRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["sensei", "admin"]);

      const excludeIds = [...new Set((staffRoles || []).map((r) => r.user_id))];

      let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });

      if (excludeIds.length > 0) {
        query = query.not("user_id", "in", `(${excludeIds.join(",")})`);
      }

      if (currentDojoId) {
        query = query.eq("dojo_id", currentDojoId);
      }

      const { data: profiles } = await query;
      return (profiles || []) as Profile[];
    },
    enabled: !!user && canManageStudents,
  });

  const studentUserIds = students?.map((s) => s.user_id) || [];

  const { data: studentPayments } = useQuery({
    queryKey: ["student-payment-status", currentDojoId, studentUserIds.join(",")],
    queryFn: async () => {
      if (studentUserIds.length === 0) return [];
      return batchedInQuery({
        table: "payments",
        column: "student_id",
        values: studentUserIds,
        select: "student_id, status, due_date",
        orderBy: { column: "due_date", ascending: false },
      });
    },
    enabled: studentUserIds.length > 0,
  });

  const { data: allStudentBelts } = useQuery({
    queryKey: ["all-student-belts", currentDojoId, studentUserIds.join(",")],
    queryFn: async () => {
      if (studentUserIds.length === 0) return [];
      return batchedInQuery({
        table: "student_belts",
        column: "user_id",
        values: studentUserIds,
        select: "user_id, martial_art, belt_grade",
      });
    },
    enabled: studentUserIds.length > 0,
  });

  const { data: guardiansWithMinors, isLoading: isLoadingGuardians } = useQuery({
    queryKey: ["guardians-with-minors", currentDojoId],
    queryFn: async () => {
      let minorQuery = supabase.from("profiles").select("*").not("guardian_user_id", "is", null);
      if (currentDojoId) minorQuery = minorQuery.eq("dojo_id", currentDojoId);
      const { data: minorProfiles } = await minorQuery;
      if (!minorProfiles || minorProfiles.length === 0) return [];

      const guardianUserIds = [...new Set(minorProfiles.map((p) => p.guardian_user_id).filter(Boolean))] as string[];
      const { data: guardianProfiles } = await supabase.from("profiles").select("*").in("user_id", guardianUserIds);
      if (!guardianProfiles) return [];

      const guardiansMap = new Map<string, GuardianWithMinors>();
      for (const guardian of guardianProfiles) {
        guardiansMap.set(guardian.user_id, {
          guardian,
          minors: minorProfiles.filter((m) => m.guardian_user_id === guardian.user_id),
        });
      }
      return Array.from(guardiansMap.values());
    },
    enabled: !!user && canManageStudents,
  });

  // ─── Helpers ─────────────────────────────────────────────
  const getStudentPaymentStatus = (userId: string): string | null => {
    const payments = studentPayments?.filter((p: any) => p.student_id === userId) || [];
    if (payments.length === 0) return null;
    if (payments.some((p: any) => p.status === "atrasado")) return "atrasado";
    if (payments.some((p: any) => p.status === "pendente")) return "pendente";
    return "pago";
  };

  const getStudentBelt = (userId: string, martialArt: string): string | null => {
    const belt = allStudentBelts?.find((b: any) => b.user_id === userId && b.martial_art === martialArt);
    return belt?.belt_grade || null;
  };

  // ─── Action handlers ────────────────────────────────────
  const fetchStudentBelts = async (studentId: string) => {
    setLoadingBelts(true);
    try {
      const { data } = await supabase.from("student_belts").select("martial_art, belt_grade").eq("user_id", studentId);
      if (data && data.length > 0) {
        setApprovalBelts(data.map((b) => ({ martial_art: b.martial_art, belt_grade: b.belt_grade as BeltGrade })));
      } else {
        const student = students?.find((s) => s.user_id === studentId);
        setApprovalBelts([{ martial_art: "judo", belt_grade: (student?.belt_grade as BeltGrade) || "branca" }]);
      }
    } catch {
      setApprovalBelts([{ martial_art: "judo", belt_grade: "branca" }]);
    } finally {
      setLoadingBelts(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedStudent) return;
    setActionLoading(true);
    try {
      const primaryBelt = approvalBelts[0]?.belt_grade || "branca";
      await supabase.from("profiles").update({
        registration_status: "aprovado",
        approved_at: new Date().toISOString(),
        approved_by: user!.id,
        belt_grade: primaryBelt,
      }).eq("user_id", selectedStudent.user_id);

      for (const belt of approvalBelts) {
        await supabase.from("student_belts").update({ belt_grade: belt.belt_grade }).eq("user_id", selectedStudent.user_id).eq("martial_art", belt.martial_art);
      }

      await supabase.rpc("assign_user_role", { _user_id: selectedStudent.user_id, _role: "student" });

      supabase.functions.invoke("send-push-notification", {
        body: { userId: selectedStudent.user_id, title: "🎉 Cadastro Aprovado!", body: `Bem-vindo ao dojo, ${selectedStudent.name}! Seu cadastro foi aprovado. Vamos treinar!`, url: "/dashboard" },
      }).catch(() => {});

      void supabase.from("notifications").insert({
        user_id: selectedStudent.user_id,
        title: "🎉 Cadastro Aprovado!",
        message: "Seu cadastro foi aprovado! Bem-vindo ao dojo.",
        type: "info",
      });

      toast({ title: "Aluno aprovado!", description: `${selectedStudent.name} foi aprovado com sucesso.` });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });

      const approvedStudent = selectedStudent;
      setActionLoading(false);
      setSelectedStudent(null);
      setActionType(null);

      try {
        let classQuery = supabase.from("classes").select("id, name, martial_art").eq("is_active", true);
        if (currentDojoId) classQuery = classQuery.eq("dojo_id", currentDojoId);
        const { data: classes } = await classQuery;
        if (classes && classes.length > 0) {
          setAvailableClasses(classes);
          setSelectedClassIds(new Set());
          setEnrollStudent(approvedStudent);
        }
      } catch {}
    } catch {
      toast({ title: "Erro", description: "Erro ao aprovar aluno", variant: "destructive" });
      setActionLoading(false);
      setSelectedStudent(null);
      setActionType(null);
    }
  };

  const handleReject = async () => {
    if (!selectedStudent) return;
    setActionLoading(true);
    try {
      await supabase.from("profiles").update({ registration_status: "rejeitado" }).eq("user_id", selectedStudent.user_id);
      toast({ title: "Cadastro rejeitado", description: `O cadastro de ${selectedStudent.name} foi rejeitado.` });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch {
      toast({ title: "Erro", description: "Erro ao rejeitar cadastro", variant: "destructive" });
    } finally {
      setActionLoading(false);
      setSelectedStudent(null);
      setActionType(null);
    }
  };

  const handleEnrollAfterApproval = async () => {
    if (!enrollStudent || selectedClassIds.size === 0) return;
    setEnrollLoading(true);
    try {
      const { data: existingBelts } = await supabase.from("student_belts").select("martial_art").eq("user_id", enrollStudent.user_id);
      const existingArts = new Set((existingBelts || []).map((b) => b.martial_art));
      const selectedClasses = availableClasses.filter(c => selectedClassIds.has(c.id));
      const requiredArts = new Set(selectedClasses.map(c => c.martial_art));
      const missingArts = [...requiredArts].filter(art => !existingArts.has(art));

      if (missingArts.length > 0) {
        const defaults: Record<string, BeltGrade> = {};
        missingArts.forEach(art => { defaults[art] = "branca"; });
        setCrossArtBelts(defaults);
        setCrossArtDialog({ student: enrollStudent, missingArts });
        setEnrollLoading(false);
        return;
      }
      await doEnrollment(enrollStudent);
    } catch {
      toast({ title: "Erro", description: "Erro ao matricular aluno", variant: "destructive" });
      setEnrollLoading(false);
    }
  };

  const handleCrossArtConfirm = async () => {
    if (!crossArtDialog) return;
    setEnrollLoading(true);
    try {
      for (const art of crossArtDialog.missingArts) {
        await supabase.from("student_belts").upsert({
          user_id: crossArtDialog.student.user_id,
          martial_art: art,
          belt_grade: crossArtBelts[art] || "branca",
          degree: 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,martial_art" });
      }
      setCrossArtDialog(null);
      await doEnrollment(crossArtDialog.student);
    } catch {
      toast({ title: "Erro", description: "Erro ao definir faixa", variant: "destructive" });
      setEnrollLoading(false);
    }
  };

  const doEnrollment = async (student: Profile) => {
    try {
      for (const classId of selectedClassIds) {
        await supabase.from("class_students").insert({ class_id: classId, student_id: student.user_id });
      }
      toast({ title: "Aluno matriculado!", description: `${student.name} foi adicionado a ${selectedClassIds.size} turma(s).` });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["all-student-belts"] });
      queryClient.invalidateQueries({ queryKey: ["student-belts"] });
    } catch {
      toast({ title: "Erro", description: "Erro ao matricular aluno", variant: "destructive" });
    } finally {
      setEnrollLoading(false);
      setEnrollStudent(null);
    }
  };

  const handleToggleFederated = async (student: Profile) => {
    const newValue = !student.is_federated;
    try {
      const { error } = await supabase.from("profiles").update({ is_federated: newValue }).eq("user_id", student.user_id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast({ title: newValue ? "Aluno federado" : "Federação removida", description: `${student.name} foi ${newValue ? "marcado como federado" : "desmarcado"}.` });
    } catch {
      toast({ title: "Erro", description: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const handleToggleScholarship = async (student: Profile, cancelPending: boolean = false) => {
    const newValue = !student.is_scholarship;
    try {
      const { error } = await supabase.from("profiles").update({ is_scholarship: newValue }).eq("user_id", student.user_id);
      if (error) throw error;
      if (newValue && cancelPending) {
        await supabase.from("payments").delete().eq("student_id", student.user_id).eq("status", "pendente").eq("category", "mensalidade");
      }
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({ title: newValue ? "Aluno marcado como bolsista" : "Bolsa removida", description: `${student.name} ${newValue ? "não receberá mensalidades programadas" : "voltará a receber mensalidades"}.` });
    } catch {
      toast({ title: "Erro", description: "Erro ao atualizar status", variant: "destructive" });
    } finally {
      setScholarshipConfirm(null);
    }
  };

  const handleScholarshipToggleClick = async (student: Profile) => {
    if (!student.is_scholarship) {
      const { data: pendingPayments } = await supabase.from("payments").select("id").eq("student_id", student.user_id).eq("status", "pendente").eq("category", "mensalidade");
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
      const { error } = await supabase.from("profiles").update({
        name: editName, phone: editPhone, belt_grade: editBelt, birth_date: editBirthDate || null,
        guardian_name: editGuardianName || null, guardian_phone: editGuardianPhone || null, guardian_email: editGuardianEmail || null,
      }).eq("user_id", editStudent.user_id);
      if (error) throw error;

      for (const belt of editStudentBelts) {
        if (belt.id) {
          await supabase.from("student_belts").update({ belt_grade: belt.belt_grade }).eq("id", belt.id);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["all-student-belts"] });
      toast({ title: "Aluno atualizado", description: `${editName} foi atualizado com sucesso.` });
    } catch {
      toast({ title: "Erro", description: "Erro ao atualizar aluno", variant: "destructive" });
    } finally {
      setActionLoading(false);
      setEditStudent(null);
    }
  };

  const handleDeleteBelt = async (beltId: string, martialArt: string) => {
    try {
      const { error } = await supabase.from("student_belts").delete().eq("id", beltId);
      if (error) throw error;
      setEditStudentBelts(prev => prev.filter(b => b.id !== beltId));
      queryClient.invalidateQueries({ queryKey: ["all-student-belts"] });
      toast({ title: "Faixa removida", description: `Faixa de ${martialArt === "judo" ? "Judô" : "Jiu-Jitsu"} removida.` });
    } catch {
      toast({ title: "Erro", description: "Erro ao remover faixa", variant: "destructive" });
    }
  };

  const handleBlockStudent = async () => {
    if (!blockStudent) return;
    setActionLoading(true);
    const isCurrentlyBlocked = blockStudent.is_blocked;
    try {
      const { error } = await supabase.from("profiles").update({
        is_blocked: !isCurrentlyBlocked,
        blocked_reason: isCurrentlyBlocked ? null : (blockReason || "Bloqueado pelo administrador"),
      }).eq("user_id", blockStudent.user_id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast({ title: isCurrentlyBlocked ? "Aluno desbloqueado" : "Aluno bloqueado", description: `${blockStudent.name} foi ${isCurrentlyBlocked ? "desbloqueado" : "bloqueado"}.` });
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
      await supabase.from("profiles").update({ registration_status: "rejeitado" }).eq("user_id", deleteStudent.user_id);
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

  const handlePermanentDelete = async () => {
    if (!permanentDeleteStudent) return;
    setActionLoading(true);
    try {
      const { error: rpcError } = await supabase.rpc("delete_student_cascade", { target_user_id: permanentDeleteStudent.user_id });
      if (rpcError) throw rpcError;
      await supabase.functions.invoke("delete-user", { body: { userId: permanentDeleteStudent.user_id } });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast({ title: "Aluno excluído permanentemente", description: `${permanentDeleteStudent.name} foi removido completamente.` });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erro ao excluir aluno";
      toast({ title: "Erro", description: msg, variant: "destructive" });
    } finally {
      setActionLoading(false);
      setPermanentDeleteStudent(null);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPwStudent || !newPassword.trim()) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-user-password", {
        body: { userId: resetPwStudent.user_id, newPassword: newPassword.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Senha redefinida!", description: `A senha de ${resetPwStudent.name} foi alterada com sucesso.` });
      setResetPwStudent(null);
      setNewPassword("");
    } catch (err: any) {
      toast({ title: "Erro ao redefinir senha", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Table callbacks ─────────────────────────────────────
  const onApproveClick = (student: Profile) => {
    setSelectedStudent(student);
    fetchStudentBelts(student.user_id);
    setActionType("approve");
  };

  const onRejectClick = (student: Profile) => {
    setSelectedStudent(student);
    setActionType("reject");
  };

  const onEditClick = (student: Profile) => {
    setEditStudent(student);
    setEditName(student.name);
    setEditPhone(student.phone || "");
    setEditBelt((student.belt_grade as BeltGrade) || "branca");
    setEditBirthDate(student.birth_date || "");
    setEditGuardianName(student.guardian_name || "");
    setEditGuardianPhone(student.guardian_phone || "");
    setEditGuardianEmail(student.guardian_email || "");
    supabase.from("student_belts").select("id, martial_art, belt_grade").eq("user_id", student.user_id).then(({ data }) => {
      setEditStudentBelts(data || []);
    });
  };

  const onViewGuardianClick = async (student: Profile) => {
    setGuardianInfoStudent(student);
    setGuardianProfile(null);
    if (student.guardian_user_id) {
      setGuardianLoading(true);
      const { data } = await supabase.from("profiles").select("*").eq("user_id", student.guardian_user_id).maybeSingle();
      setGuardianProfile(data);
      setGuardianLoading(false);
    }
  };

  // ─── Redirect if not authorized ──────────────────────────
  if (!authLoading && !canManageStudents) {
    navigate("/dashboard");
    return null;
  }

  if (authLoading || isLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  const pendingStudents = students?.filter((s) => s.registration_status === "pendente") || [];
  const approvedStudents = students?.filter((s) => s.registration_status === "aprovado" && !s.is_blocked) || [];
  const blockedStudents = students?.filter((s) => s.registration_status === "aprovado" && s.is_blocked) || [];
  const rejectedStudents = students?.filter((s) => s.registration_status === "rejeitado") || [];

  const toggleGuardianExpanded = (guardianId: string) => {
    setExpandedGuardians((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(guardianId)) newSet.delete(guardianId); else newSet.add(guardianId);
      return newSet;
    });
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-8 text-muted-foreground">
      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>{message}</p>
    </div>
  );

  const tableProps = {
    isMultiArt,
    getStudentBelt,
    getStudentPaymentStatus,
    onApprove: onApproveClick,
    onReject: onRejectClick,
    onEdit: onEditClick,
    onResetPassword: (s: Profile) => { setResetPwStudent(s); setNewPassword(""); },
    onViewGuardian: onViewGuardianClick,
    onBlock: (s: Profile) => { setBlockStudent(s); setBlockReason(s.blocked_reason || ""); },
    onDelete: setDeleteStudent,
    onPermanentDelete: setPermanentDeleteStudent,
    onToggleFederated: handleToggleFederated,
    onToggleScholarship: handleScholarshipToggleClick,
  };

  return (
    <RequireApproval>
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader title="Alunos" description="Gerencie os alunos do dojo" />
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
          <TabsTrigger value="blocked" className="gap-1.5 text-xs sm:text-sm">
            <Ban className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Bloqueados ({blockedStudents.length})</span>
            <span className="sm:hidden">Bloq. ({blockedStudents.length})</span>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-1.5 text-xs sm:text-sm">
            <UserX className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Excluídos ({rejectedStudents.length})</span>
            <span className="sm:hidden">Excl. ({rejectedStudents.length})</span>
          </TabsTrigger>
          <TabsTrigger value="guardians" className="gap-1.5 text-xs sm:text-sm">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Responsáveis</span>
            <span className="sm:hidden">Resp.</span>
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
              {pendingStudents.length > 0 ? <StudentTable data={pendingStudents} showActions {...tableProps} /> : <EmptyState message="Nenhum cadastro pendente de aprovação." />}
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
              {approvedStudents.length > 0 ? <StudentTable data={approvedStudents} showManage {...tableProps} /> : <EmptyState message="Nenhum aluno aprovado ainda." />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocked">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-warning" />
                Alunos Bloqueados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {blockedStudents.length > 0 ? <StudentTable data={blockedStudents} showManage {...tableProps} /> : <EmptyState message="Nenhum aluno bloqueado." />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rejected">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-destructive" />
                Alunos Excluídos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rejectedStudents.length > 0 ? <StudentTable data={rejectedStudents} showPermanentDelete {...tableProps} /> : <EmptyState message="Nenhum aluno excluído." />}
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
                        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleGuardianExpanded(guardian.user_id)}>
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
                            <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">{minors.length} dep.</span>
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t bg-muted/20">
                            <p className="text-xs font-medium text-muted-foreground py-3">Dependentes:</p>
                            <div className="space-y-2">
                              {minors.map((minor) => (
                                <div key={minor.user_id} className="flex items-center justify-between p-3 bg-background rounded-lg border border-border/50">
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

      {/* All dialogs */}
      <ApprovalDialog
        actionType={actionType}
        selectedStudent={selectedStudent}
        approvalBelts={approvalBelts}
        loadingBelts={loadingBelts}
        actionLoading={actionLoading}
        onClose={() => { setActionType(null); setSelectedStudent(null); setApprovalBelts([]); }}
        onApprove={handleApprove}
        onReject={handleReject}
        onBeltChange={(idx, v) => setApprovalBelts(prev => prev.map((b, i) => i === idx ? { ...b, belt_grade: v } : b))}
      />

      <ScholarshipDialog
        student={scholarshipConfirm}
        onClose={() => setScholarshipConfirm(null)}
        onKeep={() => scholarshipConfirm && handleToggleScholarship(scholarshipConfirm, false)}
        onCancel={() => scholarshipConfirm && handleToggleScholarship(scholarshipConfirm, true)}
      />

      <EditStudentDialog
        student={editStudent}
        editName={editName} editPhone={editPhone} editBelt={editBelt} editBirthDate={editBirthDate}
        editStudentBelts={editStudentBelts} editGuardianName={editGuardianName}
        editGuardianPhone={editGuardianPhone} editGuardianEmail={editGuardianEmail}
        actionLoading={actionLoading}
        onClose={() => setEditStudent(null)}
        onSave={handleEditStudent}
        onDeleteBelt={handleDeleteBelt}
        setEditName={setEditName} setEditPhone={setEditPhone} setEditBelt={setEditBelt}
        setEditBirthDate={setEditBirthDate} setEditStudentBelts={setEditStudentBelts}
        setEditGuardianName={setEditGuardianName} setEditGuardianPhone={setEditGuardianPhone}
        setEditGuardianEmail={setEditGuardianEmail}
      />

      <BlockStudentDialog
        student={blockStudent} blockReason={blockReason} actionLoading={actionLoading}
        onClose={() => { setBlockStudent(null); setBlockReason(""); }}
        onConfirm={handleBlockStudent} setBlockReason={setBlockReason}
      />

      <DeleteStudentDialog student={deleteStudent} actionLoading={actionLoading} onClose={() => setDeleteStudent(null)} onConfirm={handleDeleteStudent} />
      <DeleteStudentDialog student={permanentDeleteStudent} actionLoading={actionLoading} onClose={() => setPermanentDeleteStudent(null)} onConfirm={handlePermanentDelete} permanent />

      <EnrollmentDialog
        student={enrollStudent} availableClasses={availableClasses}
        selectedClassIds={selectedClassIds} enrollLoading={enrollLoading}
        onClose={() => setEnrollStudent(null)} onEnroll={handleEnrollAfterApproval}
        setSelectedClassIds={setSelectedClassIds}
      />

      <CrossArtBeltDialog
        dialog={crossArtDialog} crossArtBelts={crossArtBelts} enrollLoading={enrollLoading}
        onClose={() => setCrossArtDialog(null)} onConfirm={handleCrossArtConfirm}
        setCrossArtBelts={setCrossArtBelts}
      />

      <ResetPasswordDialog
        student={resetPwStudent} newPassword={newPassword} actionLoading={actionLoading}
        onClose={() => { setResetPwStudent(null); setNewPassword(""); }}
        onConfirm={handleResetPassword} setNewPassword={setNewPassword}
      />

      <GuardianInfoDialog
        student={guardianInfoStudent} guardianProfile={guardianProfile}
        guardianLoading={guardianLoading} onClose={() => setGuardianInfoStudent(null)}
      />
    </DashboardLayout>
    </RequireApproval>
  );
}

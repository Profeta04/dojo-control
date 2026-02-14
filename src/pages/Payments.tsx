import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDojoContext } from "@/hooks/useDojoContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { FinancialDashboard } from "@/components/payments/FinancialDashboard";
import { PaymentStatsCards } from "@/components/payments/PaymentStatsCards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, Plus, Loader2, DollarSign, CheckCircle2, Clock, AlertTriangle,
  Receipt, Users, Bell, QrCode, Save, User
} from "lucide-react";
import { ReceiptViewButton } from "@/components/payments/ReceiptViewButton";
import { ReceiptStatusBadge } from "@/components/payments/ReceiptStatusBadge";
import { ExportFinancialReportButton } from "@/components/payments/ExportFinancialReportButton";
import { Tables } from "@/integrations/supabase/types";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PaymentStatus, PAYMENT_STATUS_LABELS, ReceiptStatus } from "@/lib/constants";

type Profile = Tables<"profiles">;
type Payment = Tables<"payments">;
type Class = Tables<"classes">;

interface PaymentWithStudent extends Payment {
  studentName: string;
}

const STATUS_STYLES: Record<PaymentStatus, { variant: "default" | "secondary" | "destructive"; icon: typeof CheckCircle2 }> = {
  pago: { variant: "default", icon: CheckCircle2 },
  pendente: { variant: "secondary", icon: Clock },
  atrasado: { variant: "destructive", icon: AlertTriangle },
};

export default function PaymentsPage() {
  const { user, canManageStudents, isAdmin, loading: authLoading } = useAuth();
  const { currentDojoId } = useDojoContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithStudent | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [receiptFilter, setReceiptFilter] = useState<string>("all");
  const [pixKeyInput, setPixKeyInput] = useState("");
  const [pixSaving, setPixSaving] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch current dojo's PIX key
  const { data: currentDojo } = useQuery({
    queryKey: ["dojo-pix", currentDojoId],
    queryFn: async () => {
      if (!currentDojoId) return null;
      const { data, error } = await supabase.from("dojos").select("id, name, pix_key").eq("id", currentDojoId).single();
      if (error) return null;
      return data;
    },
    enabled: !!currentDojoId,
  });

  useEffect(() => {
    setPixKeyInput((currentDojo as any)?.pix_key || "");
  }, [currentDojo]);

  const handleSavePixKey = async () => {
    if (!currentDojoId) return;
    setPixSaving(true);
    try {
      const { error } = await supabase.from("dojos").update({ pix_key: pixKeyInput || null }).eq("id", currentDojoId);
      if (error) throw error;
      toast({ title: "Chave Pix salva com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["dojo-pix", currentDojoId] });
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setPixSaving(false);
    }
  };

  const [formData, setFormData] = useState({
    student_id: "",
    reference_month: format(new Date(), "yyyy-MM"),
    due_date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    notes: "",
  });

  const [batchFormData, setBatchFormData] = useState({
    class_id: "",
    reference_month: format(new Date(), "yyyy-MM"),
    due_date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    notes: "",
  });

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ["approved-students-payments", currentDojoId],
    queryFn: async () => {
      const { data: roleData, error: roleError } = await supabase.from("user_roles").select("user_id").eq("role", "student");
      if (roleError) throw roleError;
      if (!roleData || roleData.length === 0) return [];
      const studentIds = roleData.map((r) => r.user_id);
      let query = supabase.from("profiles").select("*").in("user_id", studentIds).eq("registration_status", "aprovado").order("name");
      if (currentDojoId) query = query.eq("dojo_id", currentDojoId);
      const { data, error } = await query;
      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!user && (isAdmin || !!currentDojoId),
  });

  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ["active-classes-payments", currentDojoId],
    queryFn: async () => {
      let query = supabase.from("classes").select("*").eq("is_active", true).order("name");
      if (currentDojoId) query = query.eq("dojo_id", currentDojoId);
      const { data, error } = await query;
      if (error) throw error;
      return data as Class[];
    },
    enabled: !!user && (isAdmin || !!currentDojoId),
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["payments", currentDojoId],
    queryFn: async () => {
      let studentQuery = supabase.from("profiles").select("user_id").eq("registration_status", "aprovado");
      if (currentDojoId) studentQuery = studentQuery.eq("dojo_id", currentDojoId);
      const { data: dojoStudents, error: studentsError } = await studentQuery;
      if (studentsError) throw studentsError;
      const dojoStudentIds = dojoStudents?.map((s) => s.user_id) || [];
      if (dojoStudentIds.length === 0) return [];
      const { data, error } = await supabase.from("payments").select("*").in("student_id", dojoStudentIds).order("due_date", { ascending: false });
      if (error) throw error;
      const enriched: PaymentWithStudent[] = await Promise.all(
        (data || []).map(async (p) => {
          const { data: studentProfile } = await supabase.from("profiles").select("name").eq("user_id", p.student_id).single();
          return { ...p, studentName: studentProfile?.name || "Desconhecido" };
        })
      );
      return enriched;
    },
    enabled: !!user && (isAdmin || !!currentDojoId),
  });

  const filteredPayments = payments?.filter((p) => {
    const statusMatch = statusFilter === "all" ? true : p.status === statusFilter;
    const receiptMatch = receiptFilter === "all" ? true 
      : receiptFilter === "pendente_verificacao" ? p.receipt_status === "pendente_verificacao"
      : receiptFilter === "com_comprovante" ? !!p.receipt_url
      : receiptFilter === "sem_comprovante" ? !p.receipt_url
      : true;
    return statusMatch && receiptMatch;
  });

  const resetForm = () => setFormData({ student_id: "", reference_month: format(new Date(), "yyyy-MM"), due_date: format(new Date(), "yyyy-MM-dd"), amount: "", notes: "" });
  const resetBatchForm = () => setBatchFormData({ class_id: "", reference_month: format(new Date(), "yyyy-MM"), due_date: format(new Date(), "yyyy-MM-dd"), amount: "", notes: "" });

  const handleCreatePayment = async () => {
    if (!formData.student_id || !formData.amount || !user) return;
    setFormLoading(true);
    try {
      const { error } = await supabase.from("payments").insert({
        student_id: formData.student_id,
        reference_month: formData.reference_month + "-01",
        due_date: formData.due_date,
        amount: parseFloat(formData.amount),
        notes: formData.notes || null,
        status: "pendente",
      });
      if (error) throw error;
      toast({ title: "Pagamento registrado!", description: "O pagamento foi criado com sucesso." });
      setCreateDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao criar pagamento", variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  };

  const handleBatchCreate = async () => {
    if (!batchFormData.class_id || !batchFormData.amount || !user) return;
    setBatchLoading(true);
    try {
      const { data: enrollments, error: enrollmentError } = await supabase.from("class_students").select("student_id").eq("class_id", batchFormData.class_id);
      if (enrollmentError) throw enrollmentError;
      if (!enrollments || enrollments.length === 0) {
        toast({ title: "Nenhum aluno encontrado", description: "Esta turma não possui alunos matriculados.", variant: "destructive" });
        return;
      }
      const studentIds = enrollments.map((e) => e.student_id);
      const { data: existingPayments, error: existingError } = await supabase.from("payments").select("student_id").in("student_id", studentIds).eq("reference_month", batchFormData.reference_month + "-01");
      if (existingError) throw existingError;
      const existingStudentIds = new Set(existingPayments?.map((p) => p.student_id) || []);
      const newStudentIds = studentIds.filter((id) => !existingStudentIds.has(id));
      if (newStudentIds.length === 0) {
        toast({ title: "Pagamentos já existem", description: "Todos os alunos desta turma já possuem pagamento para este mês.", variant: "destructive" });
        return;
      }
      const paymentsToInsert = newStudentIds.map((studentId) => ({
        student_id: studentId,
        reference_month: batchFormData.reference_month + "-01",
        due_date: batchFormData.due_date,
        amount: parseFloat(batchFormData.amount),
        notes: batchFormData.notes || null,
        status: "pendente" as const,
      }));
      const { error } = await supabase.from("payments").insert(paymentsToInsert);
      if (error) throw error;
      toast({
        title: "Pagamentos gerados!",
        description: `${newStudentIds.length} pagamento(s) criado(s)${existingStudentIds.size > 0 ? `. ${existingStudentIds.size} já possuíam pagamento.` : "."}`,
      });
      setBatchDialogOpen(false);
      resetBatchForm();
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao gerar pagamentos em lote", variant: "destructive" });
    } finally {
      setBatchLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: PaymentStatus) => {
    if (!selectedPayment || !user) return;
    setFormLoading(true);
    try {
      const updates: any = { status: newStatus };
      if (newStatus === "pago") {
        updates.paid_date = format(new Date(), "yyyy-MM-dd");
        if (selectedPayment.receipt_url && selectedPayment.receipt_status !== "aprovado") {
          updates.receipt_status = "aprovado";
        }
      } else {
        updates.paid_date = null;
      }
      const { error } = await supabase.from("payments").update(updates).eq("id", selectedPayment.id);
      if (error) throw error;
      toast({ title: "Status atualizado!", description: `Pagamento marcado como ${PAYMENT_STATUS_LABELS[newStatus]}.` });
      setEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao atualizar status", variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeletePayment = async () => {
    if (!selectedPayment) return;
    setFormLoading(true);
    try {
      const { error } = await supabase.from("payments").delete().eq("id", selectedPayment.id);
      if (error) throw error;
      toast({ title: "Pagamento excluído!", description: "O registro foi removido." });
      setEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao excluir pagamento", variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  };

  const handleSendNotifications = async () => {
    if (!user) return;
    setNotifyLoading(true);
    try {
      const paymentsToNotify = payments?.filter((p) => p.status === "pendente" || p.status === "atrasado");
      if (!paymentsToNotify || paymentsToNotify.length === 0) {
        toast({ title: "Nenhum pagamento pendente", description: "Não há pagamentos pendentes ou atrasados para notificar." });
        return;
      }
      const studentPayments = new Map<string, PaymentWithStudent[]>();
      paymentsToNotify.forEach((p) => {
        const existing = studentPayments.get(p.student_id) || [];
        existing.push(p);
        studentPayments.set(p.student_id, existing);
      });
      const notifications = Array.from(studentPayments.entries()).map(([studentId, list]) => {
        const isOverdue = list.some((p) => p.status === "atrasado");
        const totalAmount = list.reduce((acc, p) => acc + p.amount, 0);
        const monthsList = list.map((p) => formatMonth(p.reference_month)).join(", ");
        return {
          user_id: studentId,
          title: isOverdue ? "⚠️ Pagamento em Atraso" : "💳 Lembrete de Pagamento",
          message: `Você possui ${list.length} pagamento(s) pendente(s) referente(s) a ${monthsList}. Valor total: ${formatCurrency(totalAmount)}`,
          type: isOverdue ? "warning" : "payment",
          related_id: list[0].id,
        };
      });
      const { error } = await supabase.from("notifications").insert(notifications);
      if (error) throw error;
      toast({ title: "Notificações enviadas!", description: `${notifications.length} aluno(s) foram notificados.` });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao enviar notificações", variant: "destructive" });
    } finally {
      setNotifyLoading(false);
    }
  };

  const handleUpdateReceiptStatus = async (newReceiptStatus: ReceiptStatus) => {
    if (!selectedPayment || !user) return;
    setFormLoading(true);
    try {
      const updates: any = { receipt_status: newReceiptStatus };
      if (newReceiptStatus === "aprovado") {
        updates.status = "pago";
        updates.paid_date = format(new Date(), "yyyy-MM-dd");
      }
      // Include rejection reason in notes if rejecting
      if (newReceiptStatus === "rejeitado" && rejectionReason.trim()) {
        updates.notes = selectedPayment.notes 
          ? `${selectedPayment.notes}\n[Comprovante rejeitado: ${rejectionReason.trim()}]`
          : `[Comprovante rejeitado: ${rejectionReason.trim()}]`;
      }
      const { error } = await supabase.from("payments").update(updates).eq("id", selectedPayment.id);
      if (error) throw error;
      const notification = {
        user_id: selectedPayment.student_id,
        title: newReceiptStatus === "aprovado" ? "✅ Comprovante Aprovado" : "❌ Comprovante Rejeitado",
        message: newReceiptStatus === "aprovado"
          ? `Seu comprovante de ${formatMonth(selectedPayment.reference_month)} foi verificado e aprovado. Pagamento confirmado!`
          : `Seu comprovante de ${formatMonth(selectedPayment.reference_month)} foi rejeitado.${rejectionReason.trim() ? ` Motivo: ${rejectionReason.trim()}` : " Por favor, envie um novo comprovante válido."}`,
        type: "payment",
        related_id: selectedPayment.id,
      };
      await supabase.from("notifications").insert(notification);
      const statusLabel = newReceiptStatus === "aprovado" ? "aprovado ✅" : "rejeitado ❌";
      toast({
        title: `Comprovante ${statusLabel}`,
        description: newReceiptStatus === "aprovado" ? "Pagamento confirmado e aluno notificado." : "Aluno notificado para reenviar.",
      });
      setEditDialogOpen(false);
      setRejectionReason("");
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao atualizar comprovante", variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  };

  const openEditDialog = (payment: PaymentWithStudent) => {
    setSelectedPayment(payment);
    setRejectionReason("");
    setEditDialogOpen(true);
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return format(date, "MMMM 'de' yyyy", { locale: ptBR });
  };

  const stats = {
    total: payments?.length || 0,
    pendente: payments?.filter((p) => p.status === "pendente").length || 0,
    atrasado: payments?.filter((p) => p.status === "atrasado").length || 0,
    pago: payments?.filter((p) => p.status === "pago").length || 0,
    totalPendente: payments?.filter((p) => p.status === "pendente" || p.status === "atrasado").reduce((acc, p) => acc + p.amount, 0) || 0,
    pendingReceipts: payments?.filter((p) => p.receipt_status === "pendente_verificacao").length || 0,
  };

  if (authLoading || studentsLoading || paymentsLoading || classesLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  return (
    <RequireApproval>
    <DashboardLayout>
      <div className="flex flex-col gap-4 mb-6">
        <PageHeader title="Pagamentos" description="Controle de mensalidades dos alunos" />
        
        {canManageStudents && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleSendNotifications} disabled={notifyLoading || (stats.pendente + stats.atrasado) === 0}>
              {notifyLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bell className="h-4 w-4 mr-2" />}
              <span className="hidden sm:inline">Enviar</span> Cobranças
            </Button>
            <Button variant="outline" size="sm" onClick={() => setBatchDialogOpen(true)}>
              <Users className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Gerar em</span> Lote
            </Button>
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Novo</span> Pagamento
            </Button>
            {payments && payments.length > 0 && <ExportFinancialReportButton payments={payments} />}
          </div>
        )}
      </div>

      {/* PIX Key Configuration */}
      {canManageStudents && currentDojoId && (
        <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent shadow-sm animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <QrCode className="h-4 w-4 text-primary" />
              </div>
              Chave Pix do Dojo
            </CardTitle>
            <CardDescription>Configure a chave Pix exibida para os alunos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={pixKeyInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPixKeyInput(e.target.value)}
                placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                className="flex-1"
              />
              <Button onClick={handleSavePixKey} disabled={pixSaving} size="sm">
                {pixSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1" /> Salvar</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Dashboard Charts */}
      {canManageStudents && payments && payments.length > 0 && <FinancialDashboard payments={payments} />}

      {/* Stats Cards */}
      <PaymentStatsCards stats={stats} formatCurrency={formatCurrency} variant="admin" />

      {/* Pending Amount Alert */}
      {stats.totalPendente > 0 && (
        <Card className="mb-6 border-warning/30 bg-gradient-to-r from-warning/10 via-warning/5 to-transparent shadow-sm animate-fade-in">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-warning-foreground font-medium">Valor Pendente Total</CardDescription>
              <div className="p-2 rounded-lg bg-warning/10">
                <DollarSign className="h-5 w-5 text-warning-foreground" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-warning-foreground">
              {formatCurrency(stats.totalPendente)}
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      {/* Payments Table */}
      <Card className="shadow-sm animate-fade-in" style={{ animationDelay: "200ms" }}>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Receipt className="h-5 w-5" />
              Histórico de Pagamentos
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PaymentStatus | "all")}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="atrasado">Atrasados</SelectItem>
                  <SelectItem value="pago">Pagos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={receiptFilter} onValueChange={setReceiptFilter}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Comprovante" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente_verificacao">📎 Pendentes verif.</SelectItem>
                  <SelectItem value="com_comprovante">Com comprovante</SelectItem>
                  <SelectItem value="sem_comprovante">Sem comprovante</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredPayments && filteredPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="min-w-[140px]">Aluno</TableHead>
                    <TableHead className="hidden sm:table-cell">Referência</TableHead>
                    <TableHead className="hidden md:table-cell">Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Comprov.</TableHead>
                    {canManageStudents && <TableHead className="w-[80px]">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment, index) => {
                    const statusStyle = STATUS_STYLES[payment.status];
                    const StatusIcon = statusStyle.icon;

                    return (
                      <TableRow 
                        key={payment.id}
                        className="hover:bg-muted/30 transition-colors animate-fade-in"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm truncate max-w-[120px]">{payment.studentName}</p>
                              <p className="text-xs text-muted-foreground sm:hidden">
                                {formatMonth(payment.reference_month)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell capitalize text-sm">
                          {formatMonth(payment.reference_month)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {format(parseISO(payment.due_date), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell className="font-semibold text-sm">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusStyle.variant} className="gap-1 text-xs">
                            <StatusIcon className="h-3 w-3" />
                            <span className="hidden sm:inline">{PAYMENT_STATUS_LABELS[payment.status]}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {payment.receipt_url ? (
                            <div className="flex items-center gap-1.5">
                              <ReceiptViewButton receiptUrl={payment.receipt_url} className="text-primary" />
                              <ReceiptStatusBadge status={payment.receipt_status as ReceiptStatus} />
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        {canManageStudents && (
                          <TableCell>
                            <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-primary/10" onClick={() => openEditDialog(payment)}>
                              Editar
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                <Receipt className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground font-medium">
                {statusFilter === "all" && receiptFilter === "all"
                  ? "Nenhum pagamento registrado."
                  : "Nenhum pagamento encontrado com esses filtros."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Payment Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Pagamento</DialogTitle>
            <DialogDescription>Registrar uma nova mensalidade para um aluno</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="student">Aluno</Label>
              <Select value={formData.student_id} onValueChange={(v) => setFormData({ ...formData, student_id: v })}>
                <SelectTrigger id="student"><SelectValue placeholder="Selecionar aluno" /></SelectTrigger>
                <SelectContent>
                  {students?.map((student) => (
                    <SelectItem key={student.user_id} value={student.user_id}>{student.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reference_month">Mês de Referência</Label>
                <Input id="reference_month" type="month" value={formData.reference_month} onChange={(e) => setFormData({ ...formData, reference_month: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Data de Vencimento</Label>
                <Input id="due_date" type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input id="amount" type="number" step="0.01" min="0" placeholder="150.00" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Desconto aplicado, taxa extra, etc." rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => { setCreateDialogOpen(false); resetForm(); }}>Cancelar</Button>
              <Button onClick={handleCreatePayment} disabled={!formData.student_id || !formData.amount || formLoading}>
                {formLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : <><CreditCard className="mr-2 h-4 w-4" /> Criar Pagamento</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Payment Dialog */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Gerar Pagamentos em Lote</DialogTitle>
            <DialogDescription>Criar pagamentos para todos os alunos de uma turma</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="batch_class">Turma</Label>
              <Select value={batchFormData.class_id} onValueChange={(v) => setBatchFormData({ ...batchFormData, class_id: v })}>
                <SelectTrigger id="batch_class"><SelectValue placeholder="Selecionar turma" /></SelectTrigger>
                <SelectContent>
                  {classes?.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mês de Referência</Label>
                <Input type="month" value={batchFormData.reference_month} onChange={(e) => setBatchFormData({ ...batchFormData, reference_month: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Data de Vencimento</Label>
                <Input type="date" value={batchFormData.due_date} onChange={(e) => setBatchFormData({ ...batchFormData, due_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" min="0" placeholder="150.00" value={batchFormData.amount} onChange={(e) => setBatchFormData({ ...batchFormData, amount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea value={batchFormData.notes} onChange={(e) => setBatchFormData({ ...batchFormData, notes: e.target.value })} placeholder="Aplicado a todos os pagamentos gerados" rows={2} />
            </div>
            <div className="p-3 bg-muted/30 rounded-xl border border-border/50">
              <p className="text-xs text-muted-foreground">💡 Alunos que já possuem pagamento para o mês selecionado serão ignorados.</p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => { setBatchDialogOpen(false); resetBatchForm(); }}>Cancelar</Button>
              <Button onClick={handleBatchCreate} disabled={!batchFormData.class_id || !batchFormData.amount || batchLoading}>
                {batchLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</> : <><Users className="mr-2 h-4 w-4" /> Gerar Pagamentos</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              Gerenciar Pagamento
            </DialogTitle>
            <DialogDescription>
              {selectedPayment?.studentName} — {selectedPayment && formatMonth(selectedPayment.reference_month)}
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4">
              {/* Payment Details */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-xl border border-border/50">
                <div>
                  <Label className="text-xs text-muted-foreground">Valor</Label>
                  <p className="font-bold text-lg">{formatCurrency(selectedPayment.amount)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Vencimento</Label>
                  <p className="font-semibold">{format(parseISO(selectedPayment.due_date), "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status Atual</Label>
                  <div className="mt-1">
                    <Badge variant={STATUS_STYLES[selectedPayment.status].variant}>
                      {PAYMENT_STATUS_LABELS[selectedPayment.status]}
                    </Badge>
                  </div>
                </div>
                {selectedPayment.paid_date && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Data Pagamento</Label>
                    <p className="font-semibold">{format(parseISO(selectedPayment.paid_date), "dd/MM/yyyy")}</p>
                  </div>
                )}
              </div>

              {/* Receipt Section */}
              {selectedPayment.receipt_url && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground font-medium">Comprovante Enviado</Label>
                    <ReceiptStatusBadge status={selectedPayment.receipt_status as ReceiptStatus} />
                  </div>
                  <ReceiptViewButton receiptUrl={selectedPayment.receipt_url} className="text-primary" />
                  
                  {selectedPayment.receipt_status !== "aprovado" && (
                    <div className="space-y-3 pt-3 border-t border-primary/10">
                      {/* Rejection reason field */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Motivo da rejeição (opcional)</Label>
                        <Textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Ex: Comprovante ilegível, valor incorreto..."
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateReceiptStatus("aprovado")}
                          disabled={formLoading}
                          className="bg-success hover:bg-success/90 text-success-foreground"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleUpdateReceiptStatus("rejeitado")}
                          disabled={formLoading}
                        >
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedPayment.notes && (
                <div className="p-3 bg-muted/30 rounded-xl">
                  <Label className="text-xs text-muted-foreground">Observações</Label>
                  <p className="text-sm mt-1 whitespace-pre-line">{selectedPayment.notes}</p>
                </div>
              )}

              {/* Status Actions */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Alterar Status</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={selectedPayment.status === "pendente" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleUpdateStatus("pendente")}
                    disabled={formLoading || selectedPayment.status === "pendente"}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Pendente
                  </Button>
                  <Button
                    variant={selectedPayment.status === "pago" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleUpdateStatus("pago")}
                    disabled={formLoading || selectedPayment.status === "pago"}
                    className={selectedPayment.status === "pago" ? "bg-success text-success-foreground" : "hover:bg-success/10 hover:text-success hover:border-success/30"}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Pago
                  </Button>
                  <Button
                    variant={selectedPayment.status === "atrasado" ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => handleUpdateStatus("atrasado")}
                    disabled={formLoading || selectedPayment.status === "atrasado"}
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Atrasado
                  </Button>
                </div>
              </div>

              {/* Delete */}
              <div className="pt-4 border-t">
                <Button variant="destructive" size="sm" onClick={handleDeletePayment} disabled={formLoading} className="w-full">
                  {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir Pagamento"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
    </RequireApproval>
  );
}

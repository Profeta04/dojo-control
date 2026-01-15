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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { 
  CreditCard, 
  Plus, 
  Loader2, 
  User, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Receipt,
  Users,
  Bell,
  FileImage,
  ExternalLink
} from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PaymentStatus, PAYMENT_STATUS_LABELS } from "@/lib/constants";

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
  const { user, canManageStudents, loading: authLoading } = useAuth();
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

  // Form state
  const [formData, setFormData] = useState({
    student_id: "",
    reference_month: format(new Date(), "yyyy-MM"),
    due_date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    notes: "",
  });

  // Batch form state
  const [batchFormData, setBatchFormData] = useState({
    class_id: "",
    reference_month: format(new Date(), "yyyy-MM"),
    due_date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    notes: "",
  });

  // Fetch approved students
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ["approved-students-payments"],
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

  // Fetch active classes
  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ["active-classes-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as Class[];
    },
    enabled: !!user,
  });

  // Fetch payments
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("due_date", { ascending: false });

      if (error) throw error;

      // Enrich with student names
      const enriched: PaymentWithStudent[] = await Promise.all(
        (data || []).map(async (p) => {
          const { data: studentProfile } = await supabase
            .from("profiles")
            .select("name")
            .eq("user_id", p.student_id)
            .single();

          return {
            ...p,
            studentName: studentProfile?.name || "Desconhecido",
          };
        })
      );

      return enriched;
    },
    enabled: !!user,
  });

  const filteredPayments = payments?.filter((p) =>
    statusFilter === "all" ? true : p.status === statusFilter
  );

  const resetForm = () => {
    setFormData({
      student_id: "",
      reference_month: format(new Date(), "yyyy-MM"),
      due_date: format(new Date(), "yyyy-MM-dd"),
      amount: "",
      notes: "",
    });
  };

  const resetBatchForm = () => {
    setBatchFormData({
      class_id: "",
      reference_month: format(new Date(), "yyyy-MM"),
      due_date: format(new Date(), "yyyy-MM-dd"),
      amount: "",
      notes: "",
    });
  };

  const handleCreatePayment = async () => {
    if (!formData.student_id || !formData.amount || !user) return;

    setFormLoading(true);

    try {
      const { error } = await supabase.from("payments").insert({
        student_id: formData.student_id,
        reference_month: formData.reference_month,
        due_date: formData.due_date,
        amount: parseFloat(formData.amount),
        notes: formData.notes || null,
        registered_by: user.id,
        status: "pendente",
      });

      if (error) throw error;

      toast({
        title: "Pagamento registrado!",
        description: "O pagamento foi criado com sucesso.",
      });

      setCreateDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar pagamento",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleBatchCreate = async () => {
    if (!batchFormData.class_id || !batchFormData.amount || !user) return;

    setBatchLoading(true);

    try {
      // Fetch students enrolled in the class
      const { data: enrollments, error: enrollmentError } = await supabase
        .from("class_students")
        .select("student_id")
        .eq("class_id", batchFormData.class_id);

      if (enrollmentError) throw enrollmentError;

      if (!enrollments || enrollments.length === 0) {
        toast({
          title: "Nenhum aluno encontrado",
          description: "Esta turma não possui alunos matriculados.",
          variant: "destructive",
        });
        return;
      }

      // Check which students already have payment for this month
      const studentIds = enrollments.map((e) => e.student_id);
      const { data: existingPayments, error: existingError } = await supabase
        .from("payments")
        .select("student_id")
        .in("student_id", studentIds)
        .eq("reference_month", batchFormData.reference_month);

      if (existingError) throw existingError;

      const existingStudentIds = new Set(existingPayments?.map((p) => p.student_id) || []);
      const newStudentIds = studentIds.filter((id) => !existingStudentIds.has(id));

      if (newStudentIds.length === 0) {
        toast({
          title: "Pagamentos já existem",
          description: "Todos os alunos desta turma já possuem pagamento para este mês.",
          variant: "destructive",
        });
        return;
      }

      // Create payments for students that don't have one yet
      const paymentsToInsert = newStudentIds.map((studentId) => ({
        student_id: studentId,
        reference_month: batchFormData.reference_month,
        due_date: batchFormData.due_date,
        amount: parseFloat(batchFormData.amount),
        notes: batchFormData.notes || null,
        registered_by: user.id,
        status: "pendente" as const,
      }));

      const { error } = await supabase.from("payments").insert(paymentsToInsert);

      if (error) throw error;

      const skippedCount = existingStudentIds.size;
      const createdCount = newStudentIds.length;

      toast({
        title: "Pagamentos gerados!",
        description: `${createdCount} pagamento(s) criado(s)${skippedCount > 0 ? `. ${skippedCount} aluno(s) já possuíam pagamento para este mês.` : "."}`,
      });

      setBatchDialogOpen(false);
      resetBatchForm();
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao gerar pagamentos em lote",
        variant: "destructive",
      });
    } finally {
      setBatchLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: PaymentStatus) => {
    if (!selectedPayment || !user) return;

    setFormLoading(true);

    try {
      const updates: Partial<Payment> = {
        status: newStatus,
      };

      if (newStatus === "pago") {
        updates.paid_date = format(new Date(), "yyyy-MM-dd");
      } else {
        updates.paid_date = null;
      }

      const { error } = await supabase
        .from("payments")
        .update(updates)
        .eq("id", selectedPayment.id);

      if (error) throw error;

      toast({
        title: "Status atualizado!",
        description: `Pagamento marcado como ${PAYMENT_STATUS_LABELS[newStatus]}.`,
      });

      setEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar status",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeletePayment = async () => {
    if (!selectedPayment) return;

    setFormLoading(true);

    try {
      const { error } = await supabase
        .from("payments")
        .delete()
        .eq("id", selectedPayment.id);

      if (error) throw error;

      toast({
        title: "Pagamento excluído!",
        description: "O registro foi removido.",
      });

      setEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir pagamento",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleSendNotifications = async () => {
    if (!user) return;
    
    setNotifyLoading(true);

    try {
      // Get pending and overdue payments
      const paymentsToNotify = payments?.filter(
        (p) => p.status === "pendente" || p.status === "atrasado"
      );

      if (!paymentsToNotify || paymentsToNotify.length === 0) {
        toast({
          title: "Nenhum pagamento pendente",
          description: "Não há pagamentos pendentes ou atrasados para notificar.",
        });
        return;
      }

      // Group by student to avoid duplicate notifications
      const studentPayments = new Map<string, PaymentWithStudent[]>();
      paymentsToNotify.forEach((p) => {
        const existing = studentPayments.get(p.student_id) || [];
        existing.push(p);
        studentPayments.set(p.student_id, existing);
      });

      const notifications = Array.from(studentPayments.entries()).map(
        ([studentId, studentPaymentsList]) => {
          const isOverdue = studentPaymentsList.some((p) => p.status === "atrasado");
          const totalAmount = studentPaymentsList.reduce((acc, p) => acc + p.amount, 0);
          const monthsList = studentPaymentsList
            .map((p) => formatMonth(p.reference_month))
            .join(", ");

          return {
            user_id: studentId,
            title: isOverdue ? "⚠️ Pagamento em Atraso" : "💳 Lembrete de Pagamento",
            message: `Você possui ${studentPaymentsList.length} pagamento(s) pendente(s) referente(s) a ${monthsList}. Valor total: ${formatCurrency(totalAmount)}`,
            type: isOverdue ? "warning" : "payment",
            related_id: studentPaymentsList[0].id,
          };
        }
      );

      const { error } = await supabase.from("notifications").insert(notifications);

      if (error) throw error;

      toast({
        title: "Notificações enviadas!",
        description: `${notifications.length} aluno(s) foram notificados sobre pagamentos pendentes.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar notificações",
        variant: "destructive",
      });
    } finally {
      setNotifyLoading(false);
    }
  };

  const openEditDialog = (payment: PaymentWithStudent) => {
    setSelectedPayment(payment);
    setEditDialogOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return format(date, "MMMM 'de' yyyy", { locale: ptBR });
  };

  // Stats
  const stats = {
    total: payments?.length || 0,
    pendente: payments?.filter((p) => p.status === "pendente").length || 0,
    atrasado: payments?.filter((p) => p.status === "atrasado").length || 0,
    pago: payments?.filter((p) => p.status === "pago").length || 0,
    totalPendente: payments
      ?.filter((p) => p.status === "pendente" || p.status === "atrasado")
      .reduce((acc, p) => acc + p.amount, 0) || 0,
  };

  if (authLoading || studentsLoading || paymentsLoading || classesLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <PageHeader title="Pagamentos" description="Controle de mensalidades dos alunos" />
        
        {canManageStudents && (
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              onClick={handleSendNotifications}
              disabled={notifyLoading || (stats.pendente + stats.atrasado) === 0}
            >
              {notifyLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Bell className="h-4 w-4 mr-2" />
              )}
              Enviar Cobranças
            </Button>
            <Button variant="outline" onClick={() => setBatchDialogOpen(true)}>
              <Users className="h-4 w-4 mr-2" />
              Gerar em Lote
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Pagamento
            </Button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Registros</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> Pendentes
            </CardDescription>
            <CardTitle className="text-2xl text-muted-foreground">{stats.pendente}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Atrasados
            </CardDescription>
            <CardTitle className="text-2xl text-destructive">{stats.atrasado}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Pagos
            </CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.pago}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Pending Amount Alert */}
      {stats.totalPendente > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-amber-700 dark:text-amber-300">
                Valor Pendente Total
              </CardDescription>
              <DollarSign className="h-5 w-5 text-amber-600" />
            </div>
            <CardTitle className="text-2xl text-amber-700 dark:text-amber-300">
              {formatCurrency(stats.totalPendente)}
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Histórico de Pagamentos
            </CardTitle>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PaymentStatus | "all")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="atrasado">Atrasados</SelectItem>
                <SelectItem value="pago">Pagos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredPayments && filteredPayments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Comprovante</TableHead>
                  {canManageStudents && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => {
                  const statusStyle = STATUS_STYLES[payment.status];
                  const StatusIcon = statusStyle.icon;

                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {payment.studentName}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">
                        {formatMonth(payment.reference_month)}
                      </TableCell>
                      <TableCell>
                        {format(parseISO(payment.due_date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusStyle.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {PAYMENT_STATUS_LABELS[payment.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payment.receipt_url ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="gap-1 text-primary"
                          >
                            <a 
                              href={payment.receipt_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <FileImage className="h-4 w-4" />
                              Ver
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      {canManageStudents && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(payment)}
                          >
                            Gerenciar
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {statusFilter === "all"
                  ? "Nenhum pagamento registrado."
                  : `Nenhum pagamento ${PAYMENT_STATUS_LABELS[statusFilter].toLowerCase()}.`}
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
            <DialogDescription>
              Registrar uma nova mensalidade para um aluno
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="student">Aluno</Label>
              <Select
                value={formData.student_id}
                onValueChange={(v) => setFormData({ ...formData, student_id: v })}
              >
                <SelectTrigger id="student">
                  <SelectValue placeholder="Selecionar aluno" />
                </SelectTrigger>
                <SelectContent>
                  {students?.map((student) => (
                    <SelectItem key={student.user_id} value={student.user_id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reference_month">Mês de Referência</Label>
                <Input
                  id="reference_month"
                  type="month"
                  value={formData.reference_month}
                  onChange={(e) =>
                    setFormData({ ...formData, reference_month: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_date">Data de Vencimento</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) =>
                    setFormData({ ...formData, due_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="150.00"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Desconto aplicado, taxa extra, etc."
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateDialogOpen(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreatePayment}
                disabled={!formData.student_id || !formData.amount || formLoading}
              >
                {formLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Criar Pagamento
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Payment Dialog */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gerar Pagamentos em Lote
            </DialogTitle>
            <DialogDescription>
              Criar pagamentos para todos os alunos matriculados em uma turma
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="batch_class">Turma</Label>
              <Select
                value={batchFormData.class_id}
                onValueChange={(v) => setBatchFormData({ ...batchFormData, class_id: v })}
              >
                <SelectTrigger id="batch_class">
                  <SelectValue placeholder="Selecionar turma" />
                </SelectTrigger>
                <SelectContent>
                  {classes?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batch_reference_month">Mês de Referência</Label>
                <Input
                  id="batch_reference_month"
                  type="month"
                  value={batchFormData.reference_month}
                  onChange={(e) =>
                    setBatchFormData({ ...batchFormData, reference_month: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batch_due_date">Data de Vencimento</Label>
                <Input
                  id="batch_due_date"
                  type="date"
                  value={batchFormData.due_date}
                  onChange={(e) =>
                    setBatchFormData({ ...batchFormData, due_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch_amount">Valor (R$)</Label>
              <Input
                id="batch_amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="150.00"
                value={batchFormData.amount}
                onChange={(e) =>
                  setBatchFormData({ ...batchFormData, amount: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch_notes">Observações (opcional)</Label>
              <Textarea
                id="batch_notes"
                value={batchFormData.notes}
                onChange={(e) => setBatchFormData({ ...batchFormData, notes: e.target.value })}
                placeholder="Aplicado a todos os pagamentos gerados"
                rows={2}
              />
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                💡 Alunos que já possuem pagamento para o mês selecionado serão ignorados automaticamente.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setBatchDialogOpen(false);
                  resetBatchForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleBatchCreate}
                disabled={!batchFormData.class_id || !batchFormData.amount || batchLoading}
              >
                {batchLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    Gerar Pagamentos
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Pagamento</DialogTitle>
            <DialogDescription>
              {selectedPayment?.studentName} - {selectedPayment && formatMonth(selectedPayment.reference_month)}
            </DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4">
              {/* Payment Details */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Valor</Label>
                  <p className="font-semibold">{formatCurrency(selectedPayment.amount)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Vencimento</Label>
                  <p className="font-semibold">
                    {format(parseISO(selectedPayment.due_date), "dd/MM/yyyy")}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status Atual</Label>
                  <Badge variant={STATUS_STYLES[selectedPayment.status].variant} className="mt-1">
                    {PAYMENT_STATUS_LABELS[selectedPayment.status]}
                  </Badge>
                </div>
                {selectedPayment.paid_date && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Data do Pagamento</Label>
                    <p className="font-semibold">
                      {format(parseISO(selectedPayment.paid_date), "dd/MM/yyyy")}
                    </p>
                  </div>
                )}
              </div>

              {selectedPayment.notes && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <Label className="text-xs text-muted-foreground">Observações</Label>
                  <p className="text-sm mt-1">{selectedPayment.notes}</p>
                </div>
              )}

              {/* Status Actions */}
              <div className="space-y-2">
                <Label>Alterar Status</Label>
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
                    className={selectedPayment.status !== "pago" ? "hover:bg-green-600 hover:text-white" : "bg-green-600"}
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
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeletePayment}
                  disabled={formLoading}
                  className="w-full"
                >
                  {formLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Excluir Pagamento"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

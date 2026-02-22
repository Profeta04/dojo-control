import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDojoContext } from "@/hooks/useDojoContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { PaymentStatsCards } from "@/components/payments/PaymentStatsCards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, Clock, AlertTriangle, Receipt, User, ShieldAlert, Tag,
  ChevronDown, Loader2, CreditCard, DollarSign, Trash2,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ReceiptViewButton } from "@/components/payments/ReceiptViewButton";
import { ReceiptStatusBadge } from "@/components/payments/ReceiptStatusBadge";
import { ExportFinancialReportButton } from "@/components/payments/ExportFinancialReportButton";
import { Tables } from "@/integrations/supabase/types";
import { format, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PaymentStatus, PAYMENT_STATUS_LABELS, ReceiptStatus, PaymentCategory, PAYMENT_CATEGORY_LABELS } from "@/lib/constants";

type Payment = Tables<"payments">;

interface PaymentWithStudent extends Payment {
  studentName: string;
  studentBlocked?: boolean;
  studentScholarship?: boolean;
}

const STATUS_STYLES: Record<PaymentStatus, { variant: "default" | "secondary" | "destructive"; icon: typeof CheckCircle2 }> = {
  pago: { variant: "default", icon: CheckCircle2 },
  pendente: { variant: "secondary", icon: Clock },
  atrasado: { variant: "destructive", icon: AlertTriangle },
};

export default function PaymentHistoryPage() {
  const { user, canManageStudents, isAdmin, loading: authLoading } = useAuth();
  const { currentDojoId } = useDojoContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [receiptFilter, setReceiptFilter] = useState<string>("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithStudent | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: currentDojo } = useQuery({
    queryKey: ["dojo-details", currentDojoId],
    queryFn: async () => {
      if (!currentDojoId) return null;
      const { data, error } = await supabase
        .from("dojos")
        .select("id, name, pix_key, late_fee_percent, late_fee_fixed, daily_interest_percent, grace_days")
        .eq("id", currentDojoId)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!currentDojoId,
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["payments", currentDojoId],
    queryFn: async () => {
      let studentQuery = supabase.from("profiles").select("user_id, name, is_blocked, is_scholarship").eq("registration_status", "aprovado");
      if (currentDojoId) studentQuery = studentQuery.eq("dojo_id", currentDojoId);
      const { data: dojoStudents, error: studentsError } = await studentQuery;
      if (studentsError) throw studentsError;
      if (!dojoStudents || dojoStudents.length === 0) return [];
      const dojoStudentIds = dojoStudents.map((s) => s.user_id);
      const studentMap = new Map(dojoStudents.map((s) => [s.user_id, s]));
      const { data, error } = await supabase.from("payments").select("*").in("student_id", dojoStudentIds).order("due_date", { ascending: false });
      if (error) throw error;
      const enriched: PaymentWithStudent[] = (data || []).map((p) => {
        const student = studentMap.get(p.student_id);
        return {
          ...p,
          studentName: student?.name || "Desconhecido",
          studentBlocked: (student as any)?.is_blocked || false,
          studentScholarship: (student as any)?.is_scholarship || false,
        };
      });
      return enriched;
    },
    enabled: !!user && (isAdmin || !!currentDojoId),
  });

  const getPaymentStatus = (p: Payment): PaymentStatus => (p.status as PaymentStatus) || "pendente";

  const calculateLateFee = (payment: Payment): { fee: number; interest: number; total: number; daysLate: number } => {
    if (!currentDojo || getPaymentStatus(payment) !== "atrasado") return { fee: 0, interest: 0, total: payment.amount, daysLate: 0 };
    const dueDate = parseISO(payment.due_date);
    const today = new Date();
    const daysLate = Math.max(0, differenceInDays(today, dueDate) - ((currentDojo as any).grace_days || 0));
    if (daysLate <= 0) return { fee: 0, interest: 0, total: payment.amount, daysLate: 0 };
    const feePercent = (currentDojo as any).late_fee_percent || 0;
    const interestPercent = (currentDojo as any).daily_interest_percent || 0;
    const fixedFee = (currentDojo as any).late_fee_fixed || 0;
    const fee = payment.amount * (feePercent / 100) + fixedFee;
    const interest = payment.amount * (interestPercent / 100) * daysLate;
    return { fee, interest, total: payment.amount + fee + interest, daysLate };
  };

  const filteredPayments = payments?.filter((p) => {
    const status = getPaymentStatus(p);
    const statusMatch = statusFilter === "all" ? true : status === statusFilter;
    const receiptMatch = receiptFilter === "all" ? true 
      : receiptFilter === "pendente_verificacao" ? p.receipt_status === "pendente_verificacao"
      : receiptFilter === "com_comprovante" ? !!p.receipt_url
      : receiptFilter === "sem_comprovante" ? !p.receipt_url
      : true;
    return statusMatch && receiptMatch;
  });

  const groupedPayments = {
    pendente_verificacao: filteredPayments?.filter((p) => p.receipt_status === "pendente_verificacao") || [],
    atrasado: filteredPayments?.filter((p) => getPaymentStatus(p) === "atrasado" && p.receipt_status !== "pendente_verificacao") || [],
    pendente: filteredPayments?.filter((p) => getPaymentStatus(p) === "pendente" && p.receipt_status !== "pendente_verificacao") || [],
    pago: filteredPayments?.filter((p) => getPaymentStatus(p) === "pago" && p.receipt_status !== "pendente_verificacao") || [],
  };

  const SECTION_CONFIG = [
    { key: "pendente_verificacao" as const, label: "Comprovantes para Verificar", subtitle: "Aguardando sua análise", icon: Receipt, color: "text-primary", bgColor: "bg-primary/10", borderColor: "border-primary/30", headerBg: "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" },
    { key: "atrasado" as const, label: "Pagamentos Atrasados", subtitle: "Requerem atenção imediata", icon: AlertTriangle, color: "text-destructive", bgColor: "bg-destructive/10", borderColor: "border-destructive/30", headerBg: "bg-gradient-to-r from-destructive/10 via-destructive/5 to-transparent" },
    { key: "pendente" as const, label: "Pagamentos Pendentes", subtitle: "Aguardando pagamento dos alunos", icon: Clock, color: "text-warning-foreground", bgColor: "bg-warning/10", borderColor: "border-warning/30", headerBg: "bg-gradient-to-r from-warning/10 via-warning/5 to-transparent" },
    { key: "pago" as const, label: "Pagamentos Confirmados", subtitle: "Pagamentos recebidos com sucesso", icon: CheckCircle2, color: "text-success", bgColor: "bg-success/10", borderColor: "border-success/30", headerBg: "bg-gradient-to-r from-success/10 via-success/5 to-transparent" },
  ];

  const stats = {
    total: payments?.length || 0,
    pendente: payments?.filter((p) => p.status === "pendente").length || 0,
    atrasado: payments?.filter((p) => p.status === "atrasado").length || 0,
    pago: payments?.filter((p) => getPaymentStatus(p) === "pago").length || 0,
    totalPendente: payments?.filter((p) => getPaymentStatus(p) === "pendente" || getPaymentStatus(p) === "atrasado").reduce((acc, p) => acc + p.amount, 0) || 0,
    pendingReceipts: payments?.filter((p) => p.receipt_status === "pendente_verificacao").length || 0,
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatMonth = (monthStr: string | null) => {
    if (!monthStr) return "—";
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return format(date, "MMMM 'de' yyyy", { locale: ptBR });
  };

  const openEditDialog = (payment: PaymentWithStudent) => {
    setSelectedPayment(payment);
    setRejectionReason("");
    setEditDialogOpen(true);
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

      if (newStatus === "pago") {
        await supabase.from("notifications").insert({
          user_id: selectedPayment.student_id,
          title: "✅ Pagamento Confirmado",
          message: `Seu pagamento de ${formatMonth(selectedPayment.reference_month)} foi confirmado!`,
          type: "payment",
          related_id: selectedPayment.id,
        });
      }

      toast({ title: `Status atualizado para ${PAYMENT_STATUS_LABELS[newStatus]}` });
      setEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateReceiptStatus = async (newReceiptStatus: "aprovado" | "rejeitado") => {
    if (!selectedPayment || !user) return;
    setFormLoading(true);
    try {
      const updates: any = { receipt_status: newReceiptStatus };
      if (newReceiptStatus === "aprovado") {
        updates.status = "pago";
        updates.paid_date = format(new Date(), "yyyy-MM-dd");
      }
      const { error } = await supabase.from("payments").update(updates).eq("id", selectedPayment.id);
      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: selectedPayment.student_id,
        title: newReceiptStatus === "aprovado" ? "✅ Comprovante Aprovado" : "❌ Comprovante Rejeitado",
        message: newReceiptStatus === "aprovado"
          ? `Seu comprovante de ${formatMonth(selectedPayment.reference_month)} foi verificado e aprovado. Pagamento confirmado!`
          : `Seu comprovante de ${formatMonth(selectedPayment.reference_month)} foi rejeitado.${rejectionReason.trim() ? ` Motivo: ${rejectionReason.trim()}` : " Por favor, envie um novo comprovante válido."}`,
        type: "payment",
        related_id: selectedPayment.id,
      });

      toast({
        title: `Comprovante ${newReceiptStatus === "aprovado" ? "aprovado ✅" : "rejeitado ❌"}`,
        description: newReceiptStatus === "aprovado" ? "Pagamento confirmado e aluno notificado." : "Aluno notificado para reenviar.",
      });
      setEditDialogOpen(false);
      setRejectionReason("");
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  };

  if (authLoading || paymentsLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  return (
    <RequireApproval>
    <DashboardLayout>
      <div className="flex flex-col gap-4 mb-6">
        <PageHeader title="Histórico de Pagamentos" description="Lista detalhada de todas as cobranças" />
        {payments && payments.length > 0 && <ExportFinancialReportButton payments={payments} />}
      </div>

      {/* Stats Cards */}
      <PaymentStatsCards stats={stats} formatCurrency={formatCurrency} variant="admin" />

      {stats.totalPendente > 0 && (
        <Card className="mb-4 border-warning/30 bg-gradient-to-r from-warning/10 via-warning/5 to-transparent shadow-sm">
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

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-4">
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

      {/* Sectioned Payments */}
      {filteredPayments && filteredPayments.length > 0 ? (
        <div className="space-y-6">
          {SECTION_CONFIG.map((section, sectionIdx) => {
            const sectionPayments = groupedPayments[section.key];
            if (sectionPayments.length === 0) return null;
            const SectionIcon = section.icon;

            return (
              <Collapsible key={section.key} defaultOpen className="animate-fade-in" style={{ animationDelay: `${sectionIdx * 100}ms` }}>
                <CollapsibleTrigger asChild>
                  <div className={`flex items-center justify-between p-4 rounded-t-xl border border-b-0 ${section.borderColor} ${section.headerBg} cursor-pointer hover:bg-muted/20 transition-colors group`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${section.bgColor} shadow-sm`}>
                        <SectionIcon className={`h-5 w-5 ${section.color}`} />
                      </div>
                      <div>
                        <h3 className={`font-semibold text-sm sm:text-base ${section.color}`}>{section.label}</h3>
                        <p className="text-xs text-muted-foreground">{section.subtitle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-muted-foreground">Subtotal</p>
                        <p className={`font-bold text-sm ${section.color}`}>
                          {formatCurrency(sectionPayments.reduce((acc, p) => acc + p.amount, 0))}
                        </p>
                      </div>
                      <Badge variant="secondary" className={`text-xs font-semibold px-2.5 py-1 ${section.bgColor} ${section.color} border-0`}>
                        {sectionPayments.length}
                      </Badge>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <Card className={`shadow-sm border ${section.borderColor} rounded-t-none`}>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/20">
                              <TableHead className="min-w-[140px]">Aluno</TableHead>
                              <TableHead className="hidden lg:table-cell">Categoria</TableHead>
                              <TableHead className="hidden sm:table-cell">Referência</TableHead>
                              <TableHead className="hidden md:table-cell">Vencimento</TableHead>
                              <TableHead>Valor</TableHead>
                              <TableHead>Comprov.</TableHead>
                              {canManageStudents && <TableHead className="w-[80px] text-right">Ações</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sectionPayments.map((payment) => {
                              const status = getPaymentStatus(payment);
                              const category = (payment as any).category as PaymentCategory | undefined;
                              const lateFee = section.key === "atrasado" ? calculateLateFee(payment) : null;

                              return (
                                <TableRow 
                                  key={payment.id}
                                  className="hover:bg-muted/30 transition-all duration-200 group"
                                >
                                  <TableCell>
                                    <div className="flex items-center gap-2.5">
                                      <div className={`w-8 h-8 rounded-full ${section.bgColor} flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 relative`}>
                                        <User className={`h-4 w-4 ${section.color}`} />
                                        {payment.studentBlocked && (
                                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive flex items-center justify-center">
                                            <ShieldAlert className="h-2.5 w-2.5 text-destructive-foreground" />
                                          </div>
                                        )}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-1">
                                          <p className="font-medium text-sm truncate max-w-[140px]">{payment.studentName}</p>
                                          {payment.studentScholarship && (
                                            <Badge variant="outline" className="text-[10px] px-1 py-0 border-accent text-accent-foreground">
                                              Bolsista
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-xs text-muted-foreground sm:hidden">
                                          {formatMonth(payment.reference_month)}
                                        </p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden lg:table-cell">
                                    <Badge variant="outline" className="text-xs gap-1">
                                      <Tag className="h-3 w-3" />
                                      {PAYMENT_CATEGORY_LABELS[category || "mensalidade"]}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="hidden sm:table-cell capitalize text-sm">
                                    {formatMonth(payment.reference_month)}
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                    {format(parseISO(payment.due_date), "dd/MM/yyyy")}
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <p className="font-semibold text-sm">{formatCurrency(payment.amount)}</p>
                                      {lateFee && lateFee.daysLate > 0 && (
                                        <p className="text-xs text-destructive font-medium">
                                          +{formatCurrency(lateFee.fee + lateFee.interest)}
                                        </p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {payment.receipt_url ? (
                                      <div className="flex items-center gap-1.5">
                                        <ReceiptViewButton receiptUrl={payment.receipt_url} className="text-primary" />
                                        <ReceiptStatusBadge status={payment.receipt_status as ReceiptStatus} />
                                      </div>
                                    ) : (
                                      <span className="text-xs text-muted-foreground italic">Sem comprovante</span>
                                    )}
                                  </TableCell>
                                  {canManageStudents && (
                                    <TableCell className="text-right">
                                      <Button variant="ghost" size="sm" className={`h-8 px-3 hover:${section.bgColor} ${section.color} opacity-70 group-hover:opacity-100 transition-opacity`} onClick={() => openEditDialog(payment)}>
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
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      ) : (
        <Card className="shadow-sm animate-fade-in">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                <Receipt className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground font-medium">
                {statusFilter === "all" && receiptFilter === "all"
                  ? "Nenhum pagamento registrado."
                  : "Nenhum pagamento encontrado com esses filtros."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge variant={STATUS_STYLES[getPaymentStatus(selectedPayment)].variant}>
                      {PAYMENT_STATUS_LABELS[getPaymentStatus(selectedPayment)]}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Categoria</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className="gap-1">
                      <Tag className="h-3 w-3" />
                      {PAYMENT_CATEGORY_LABELS[((selectedPayment as any).category as PaymentCategory) || "mensalidade"]}
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

              {getPaymentStatus(selectedPayment) === "atrasado" && (() => {
                const lateFee = calculateLateFee(selectedPayment);
                return lateFee.daysLate > 0 ? (
                  <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl space-y-2">
                    <Label className="text-xs text-destructive font-medium">Multa e Juros ({lateFee.daysLate} dia(s) de atraso)</Label>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Multa</p>
                        <p className="font-semibold text-destructive">{formatCurrency(lateFee.fee)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Juros</p>
                        <p className="font-semibold text-destructive">{formatCurrency(lateFee.interest)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-bold text-destructive">{formatCurrency(lateFee.total)}</p>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}

              {selectedPayment.receipt_url && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground font-medium">Comprovante Enviado</Label>
                    <ReceiptStatusBadge status={selectedPayment.receipt_status as ReceiptStatus} />
                  </div>
                  <ReceiptViewButton receiptUrl={selectedPayment.receipt_url} className="text-primary" />
                  
                  {selectedPayment.receipt_status !== "aprovado" && (
                    <div className="space-y-3 pt-3 border-t border-primary/10">
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

              <div className="space-y-2">
                <Label className="text-sm font-medium">Alterar Status</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={getPaymentStatus(selectedPayment) === "pendente" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleUpdateStatus("pendente")}
                    disabled={formLoading || getPaymentStatus(selectedPayment) === "pendente"}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Pendente
                  </Button>
                  <Button
                    variant={getPaymentStatus(selectedPayment) === "pago" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleUpdateStatus("pago")}
                    disabled={formLoading || getPaymentStatus(selectedPayment) === "pago"}
                    className={getPaymentStatus(selectedPayment) !== "pago" ? "border-success/30 text-success hover:bg-success/10" : ""}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Pago
                  </Button>
                  <Button
                    variant={getPaymentStatus(selectedPayment) === "atrasado" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleUpdateStatus("atrasado")}
                    disabled={formLoading || getPaymentStatus(selectedPayment) === "atrasado"}
                    className={getPaymentStatus(selectedPayment) !== "atrasado" ? "border-destructive/30 text-destructive hover:bg-destructive/10" : ""}
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
                  onClick={async () => {
                    if (!selectedPayment) return;
                    setFormLoading(true);
                    try {
                      const { error } = await supabase.from("payments").delete().eq("id", selectedPayment.id);
                      if (error) throw error;
                      toast({ title: "Pagamento excluído com sucesso" });
                      setEditDialogOpen(false);
                      queryClient.invalidateQueries({ queryKey: ["payments"] });
                    } catch (error: any) {
                      toast({ title: "Erro", description: error.message || "Erro ao excluir pagamento", variant: "destructive" });
                    } finally {
                      setFormLoading(false);
                    }
                  }}
                  disabled={formLoading}
                  className="w-full"
                >
                  {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="h-4 w-4 mr-2" />Excluir Pagamento</>}
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
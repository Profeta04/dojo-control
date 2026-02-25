import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { GuardianPasswordGate } from "@/components/auth/GuardianPasswordGate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard, CheckCircle2, Clock, AlertTriangle, Copy, QrCode, Mail,
  Upload, Loader2, FileImage, DollarSign, CalendarClock, TrendingUp, Tag
} from "lucide-react";
import { ReceiptViewButton } from "@/components/payments/ReceiptViewButton";
import { ReceiptStatusBadge } from "@/components/payments/ReceiptStatusBadge";
import { ReceiptProgress } from "@/components/payments/ReceiptProgress";
import { PaymentStatsCards } from "@/components/payments/PaymentStatsCards";
import { PixQRCodePayment } from "@/components/payments/PixQRCodePayment";
import { Tables } from "@/integrations/supabase/types";
import { format, parseISO, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PaymentStatus, PAYMENT_STATUS_LABELS, PAYMENT_CATEGORY_LABELS, PaymentCategory } from "@/lib/constants";
import { differenceInCalendarDays } from "date-fns";

type Payment = Tables<"payments">;

const STATUS_STYLES: Record<PaymentStatus, { variant: "default" | "secondary" | "destructive"; icon: typeof CheckCircle2 }> = {
  pago: { variant: "default", icon: CheckCircle2 },
  pendente: { variant: "secondary", icon: Clock },
  atrasado: { variant: "destructive", icon: AlertTriangle },
};

export default function StudentPaymentsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [copied, setCopied] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [guardianVerified, setGuardianVerified] = useState(false);
  const [pixDialogPayment, setPixDialogPayment] = useState<Payment | null>(null);

  // Fetch PIX key from the student's dojo
  const { data: dojoData } = useQuery({
    queryKey: ["student-dojo-pix", profile?.dojo_id],
    queryFn: async () => {
      if (!profile?.dojo_id) return null;
      const { data, error } = await supabase
        .from("dojos")
        .select("pix_key, name, late_fee_percent, late_fee_fixed, daily_interest_percent, grace_days")
        .eq("id", profile.dojo_id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!profile?.dojo_id,
  });


  const pixKey = (dojoData as any)?.pix_key || "Chave Pix não configurada";

  const calculateLateFees = (payment: Payment) => {
    if (payment.status !== "atrasado" || !dojoData) return null;
    const dojo = dojoData as any;
    const graceDays = dojo.grace_days || 0;
    const daysLate = differenceInCalendarDays(new Date(), parseISO(payment.due_date)) - graceDays;
    if (daysLate <= 0) return null;
    const feePercent = dojo.late_fee_percent || 0;
    const fixedFee = dojo.late_fee_fixed || 0;
    const interestPercent = dojo.daily_interest_percent || 0;
    const fee = payment.amount * (feePercent / 100) + fixedFee;
    const interest = payment.amount * (interestPercent / 100) * daysLate;
    const total = payment.amount + fee + interest;
    return { fee, interest, total, daysLate };
  };

  const isMinorWithGuardian = useMemo(() => {
    if (!profile?.birth_date || !profile?.guardian_email) return false;
    const birthDate = new Date(profile.birth_date);
    const age = differenceInYears(new Date(), birthDate);
    return age < 18;
  }, [profile]);

  useEffect(() => {
    const stored = sessionStorage.getItem("guardian_verified");
    if (stored) {
      try {
        const { expiry } = JSON.parse(stored);
        if (Date.now() < expiry) {
          setGuardianVerified(true);
        } else {
          sessionStorage.removeItem("guardian_verified");
        }
      } catch {
        sessionStorage.removeItem("guardian_verified");
      }
    }
  }, []);


  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ["student-payments", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("student_id", user.id)
        .order("due_date", { ascending: false });
      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!user,
  });

  // ─── Handle shared files from Web Share Target ───
  const processSharedFile = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('shared') !== '1') return;
    
    try {
      const cache = await caches.open('shared-files');
      const response = await cache.match('/shared-file-latest');
      if (!response) return;
      
      const blob = await response.blob();
      const fileName = response.headers.get('X-File-Name') || 'comprovante.jpg';
      const sharedFile = new File([blob], fileName, { type: blob.type });
      
      await cache.delete('/shared-file-latest');
      
      const url = new URL(window.location.href);
      url.searchParams.delete('shared');
      window.history.replaceState({}, '', url.pathname + url.search);
      
      (window as any).__sharedReceiptFile = sharedFile;
      
      toast({
        title: "📎 Comprovante recebido!",
        description: "Selecione o pagamento correspondente e clique em 'Enviar Comprovante' para vincular.",
      });
    } catch (error) {
      console.error('Error processing shared file:', error);
    }
  }, [toast]);

  useEffect(() => {
    if (!paymentsLoading && payments) {
      processSharedFile();
    }
  }, [paymentsLoading, payments, processSharedFile]);


  const handleCopyPix = async () => {
    if (!(dojoData as any)?.pix_key) {
      toast({
        title: "Chave Pix não configurada",
        description: "Entre em contato com a administração do dojo.",
        variant: "destructive",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText((dojoData as any).pix_key);
      setCopied(true);
      toast({ title: "Chave Pix copiada!", description: "Cole no seu aplicativo de banco para fazer o pagamento." });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({ title: "Erro ao copiar", description: "Não foi possível copiar a chave Pix.", variant: "destructive" });
    }
  };

  const openUploadDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setUploadDialogOpen(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPayment || !user) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Tipo de arquivo inválido", description: "Envie uma imagem (JPG, PNG, WEBP) ou PDF.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "O arquivo deve ter no máximo 5MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${selectedPayment.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from("payment-receipts").upload(fileName, file);
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("payments")
        .update({ receipt_url: fileName, receipt_status: "pendente_verificacao" })
        .eq("id", selectedPayment.id);
      if (updateError) throw updateError;

      const { data: studentProfile } = await supabase.from("profiles").select("name").eq("user_id", user.id).single();

      const { data: adminSenseiRoles } = await supabase.from("user_roles").select("user_id").in("role", ["admin", "sensei"]);
      if (adminSenseiRoles && adminSenseiRoles.length > 0) {
        const notifications = adminSenseiRoles.map((role) => ({
          user_id: role.user_id,
          title: "📎 Novo Comprovante Recebido",
          message: `${studentProfile?.name || "Um aluno"} enviou um comprovante de pagamento referente a ${formatMonth(selectedPayment.reference_month)}.`,
          type: "payment",
          related_id: selectedPayment.id,
        }));
        await supabase.from("notifications").insert(notifications);
      }

      toast({ title: "Comprovante enviado!", description: "Seu comprovante foi enviado e está aguardando verificação." });
      setUploadDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["student-payments", user.id] });
    } catch (error: any) {
      toast({ title: "Erro ao enviar", description: error.message || "Não foi possível enviar o comprovante.", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return format(date, "MMMM 'de' yyyy", { locale: ptBR });
  };

  // Stats with late fees included
  const statsWithFees = useMemo(() => {
    if (!payments) return { total: 0, pendente: 0, atrasado: 0, pago: 0, totalPendente: 0, totalWithFees: 0 };
    let totalWithFees = 0;
    payments.forEach((p) => {
      if (p.status === "pendente" || p.status === "atrasado") {
        const fees = calculateLateFees(p);
        totalWithFees += fees ? fees.total : p.amount;
      }
    });
    return {
      total: payments.length,
      pendente: payments.filter((p) => p.status === "pendente").length,
      atrasado: payments.filter((p) => p.status === "atrasado").length,
      pago: payments.filter((p) => p.status === "pago").length,
      totalPendente: payments.filter((p) => p.status === "pendente" || p.status === "atrasado").reduce((acc, p) => acc + p.amount, 0),
      totalWithFees,
    };
  }, [payments, dojoData]);

  // Next due payment
  const nextDuePayment = useMemo(() => {
    if (!payments) return null;
    const pending = payments
      .filter((p) => p.status === "pendente" || p.status === "atrasado")
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
    return pending[0] || null;
  }, [payments]);

  // Group payments by status
  const groupedPayments = useMemo(() => {
    if (!payments) return { atrasado: [], pendente: [], pago: [] };
    return {
      atrasado: payments.filter((p) => p.status === "atrasado"),
      pendente: payments.filter((p) => p.status === "pendente"),
      pago: payments.filter((p) => p.status === "pago"),
    };
  }, [payments]);

  const navMode = localStorage.getItem(`nav-mode-${profile?.user_id}`) || "bottom";
  const isSidebarMode = navMode === "sidebar";

  const SECTION_CONFIG = [
    { key: "atrasado" as const, label: "Pagamentos Atrasados", subtitle: "Regularize sua situação", icon: AlertTriangle, color: "text-destructive", bgColor: "bg-destructive/10", borderColor: "border-destructive/30", headerBg: "bg-gradient-to-r from-destructive/10 via-destructive/5 to-transparent" },
    { key: "pendente" as const, label: "Pagamentos Pendentes", subtitle: "Aguardando pagamento", icon: Clock, color: "text-warning-foreground", bgColor: "bg-warning/10", borderColor: "border-warning/30", headerBg: "bg-gradient-to-r from-warning/10 via-warning/5 to-transparent" },
    ...(!isSidebarMode ? [{ key: "pago" as const, label: "Pagamentos Confirmados", subtitle: "Pagamentos realizados", icon: CheckCircle2, color: "text-success", bgColor: "bg-success/10", borderColor: "border-success/30", headerBg: "bg-gradient-to-r from-success/10 via-success/5 to-transparent" }] : []),
  ];

  if (authLoading || paymentsLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  if (isMinorWithGuardian && !guardianVerified) {
    return (
      <DashboardLayout>
        <GuardianPasswordGate
          guardianEmail={profile?.guardian_email || ""}
          onSuccess={() => setGuardianVerified(true)}
          title="Área de Pagamentos"
          description="Acesso restrito para maiores de idade"
        />
      </DashboardLayout>
    );
  }

  return (
    <RequireApproval>
    <DashboardLayout>
      <PageHeader title="Pagamentos" description="Informações sobre seus pagamentos" />

      {/* Summary Card for Sidebar Mode */}
      {isSidebarMode && (statsWithFees.pendente > 0 || statsWithFees.atrasado > 0) && (
        <div className="grid gap-4 mb-6 sm:grid-cols-2">
          {statsWithFees.atrasado > 0 && (
            <Card className="border-destructive/30 overflow-hidden">
              <div className="h-1 bg-destructive" />
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Atrasados</p>
                    <p className="text-2xl font-bold text-destructive mt-1">{statsWithFees.atrasado}</p>
                    <p className="text-xs text-destructive/70 mt-0.5">
                      {formatCurrency(groupedPayments.atrasado.reduce((sum, p) => {
                        const fees = calculateLateFees(p);
                        return sum + (fees ? fees.total : p.amount);
                      }, 0))}
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-destructive/10">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {statsWithFees.pendente > 0 && (
            <Card className="border-warning/30 overflow-hidden">
              <div className="h-1 bg-warning" />
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Pendentes</p>
                    <p className="text-2xl font-bold text-warning-foreground mt-1">{statsWithFees.pendente}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatCurrency(groupedPayments.pendente.reduce((sum, p) => sum + p.amount, 0))}
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-warning/10">
                    <Clock className="h-5 w-5 text-warning-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div data-tour="payment-stats">
        <PaymentStatsCards stats={statsWithFees} formatCurrency={formatCurrency} variant="student" />
      </div>

      {/* Highlight Cards: Total com taxas + Próximo vencimento */}
      <div className="grid gap-4 mb-6 sm:grid-cols-2" data-tour="payment-summary">
        {/* Total devido - estilo intimidador só quando há atraso */}
        {statsWithFees.atrasado > 0 && statsWithFees.totalWithFees > 0 && (
          <Card className="border-destructive/30 bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent shadow-sm animate-fade-in overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-destructive/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="pb-2 relative">
              <div className="flex items-center justify-between">
                <CardDescription className="text-destructive font-medium flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" />
                  Total Devido (com taxas)
                </CardDescription>
              </div>
              <CardTitle className="text-3xl font-bold text-destructive">
                {formatCurrency(statsWithFees.totalWithFees)}
              </CardTitle>
              {statsWithFees.totalWithFees > statsWithFees.totalPendente && (
                <p className="text-xs text-destructive/70 mt-1">
                  Inclui {formatCurrency(statsWithFees.totalWithFees - statsWithFees.totalPendente)} em multas e juros
                </p>
              )}
            </CardHeader>
          </Card>
        )}
        {/* Total devido - estilo neutro quando só há pendentes */}
        {statsWithFees.atrasado === 0 && statsWithFees.totalPendente > 0 && (
          <Card className="border-border/40 bg-gradient-to-br from-muted/50 via-muted/20 to-transparent shadow-sm animate-fade-in overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-muted/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="pb-2 relative">
              <div className="flex items-center justify-between">
                <CardDescription className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4" />
                  Total Pendente
                </CardDescription>
              </div>
              <CardTitle className="text-3xl font-bold text-foreground">
                {formatCurrency(statsWithFees.totalPendente)}
              </CardTitle>
            </CardHeader>
          </Card>
        )}

        {/* Próximo vencimento */}
        {nextDuePayment && (
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent shadow-sm animate-fade-in overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardHeader className="pb-2 relative">
              <div className="flex items-center justify-between">
                <CardDescription className="text-primary font-medium flex items-center gap-1.5">
                  <CalendarClock className="h-4 w-4" />
                  Próximo Vencimento
                </CardDescription>
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                {format(parseISO(nextDuePayment.due_date), "dd 'de' MMMM", { locale: ptBR })}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {PAYMENT_CATEGORY_LABELS[nextDuePayment.category as PaymentCategory] || nextDuePayment.category}
                </Badge>
                <span className="text-sm font-semibold">{formatCurrency(nextDuePayment.amount)}</span>
              </div>
            </CardHeader>
          </Card>
        )}
      </div>

      {/* Pix Payment Card */}
      <Card data-tour="pix-card" className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent shadow-sm hover-scale animate-fade-in overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <QrCode className="h-5 w-5 text-primary" />
            </div>
            Pagar via Pix
          </CardTitle>
          <CardDescription>
            Clique em "Pagar" ao lado de um pagamento pendente para gerar o QR Code com o valor exato
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 relative">
          <div className="flex items-center gap-3 p-4 bg-muted/60 backdrop-blur-sm rounded-xl border border-border/50">
            <div className="p-2 rounded-lg bg-muted">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>
            <code className="flex-1 text-sm font-mono break-all text-foreground/80">
              {pixKey}
            </code>
            <Button
              variant={copied ? "default" : "outline"}
              size="sm"
              onClick={handleCopyPix}
              className={`flex-shrink-0 transition-all duration-300 ${copied ? "scale-105" : ""}`}
            >
              {copied ? (
                <><CheckCircle2 className="h-4 w-4 mr-1" /> Copiado!</>
              ) : (
                <><Copy className="h-4 w-4 mr-1" /> Copiar</>
              )}
            </Button>
          </div>

          <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
            <p className="text-sm text-muted-foreground">
              💡 Clique em <strong>"Pagar"</strong> em qualquer pagamento pendente para gerar um QR Code Pix com o valor já preenchido.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sectioned Payments */}
      {payments && payments.length > 0 ? (
        <div className="space-y-6" data-tour="payment-list">
          {SECTION_CONFIG.map((section, sectionIdx) => {
            const sectionPayments = groupedPayments[section.key];
            if (sectionPayments.length === 0) return null;
            const SectionIcon = section.icon;

            return (
              <div key={section.key} className="animate-fade-in" style={{ animationDelay: `${sectionIdx * 100}ms` }}>
                {/* Section Header */}
                <div className={`flex items-center justify-between p-4 rounded-t-xl border border-b-0 ${section.borderColor} ${section.headerBg}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${section.bgColor} shadow-sm`}>
                      <SectionIcon className={`h-5 w-5 ${section.color}`} />
                    </div>
                    <div>
                      <h3 className={`font-semibold text-sm sm:text-base ${section.color}`}>{section.label}</h3>
                      <p className="text-xs text-muted-foreground">{section.subtitle}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className={`text-xs font-semibold px-2.5 py-1 ${section.bgColor} ${section.color} border-0`}>
                    {sectionPayments.length}
                  </Badge>
                </div>

                {/* Section Table */}
                <Card className={`shadow-sm border ${section.borderColor} rounded-t-none`}>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/20">
                            <TableHead>Referência</TableHead>
                            <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                            <TableHead className="hidden sm:table-cell">Vencimento</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead className="text-right">Comprovante</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sectionPayments.map((payment, index) => {
                            const lateFees = calculateLateFees(payment);

                            return (
                              <TableRow 
                                key={payment.id}
                                className="hover:bg-muted/30 transition-colors animate-fade-in"
                                style={{ animationDelay: `${index * 50}ms` }}
                              >
                                <TableCell>
                                  <div>
                                    <p className="capitalize font-medium text-sm">
                                      {formatMonth(payment.reference_month)}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0 sm:hidden">
                                        <Tag className="h-2.5 w-2.5" />
                                        {PAYMENT_CATEGORY_LABELS[payment.category as PaymentCategory] || payment.category}
                                      </Badge>
                                    </div>
                                    {payment.description && (
                                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                        {payment.description}
                                      </p>
                                    )}
                                    <p className="text-xs text-muted-foreground sm:hidden">
                                      {format(parseISO(payment.due_date), "dd/MM/yyyy")}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <Tag className="h-3 w-3" />
                                    {PAYMENT_CATEGORY_LABELS[payment.category as PaymentCategory] || payment.category}
                                  </Badge>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                                  {format(parseISO(payment.due_date), "dd/MM/yyyy")}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-semibold text-sm">{formatCurrency(payment.amount)}</p>
                                    {lateFees && (
                                      <div className="text-xs space-y-0.5 mt-1">
                                        {lateFees.fee > 0 && (
                                          <p className="text-destructive">+ {formatCurrency(lateFees.fee)} multa</p>
                                        )}
                                        {lateFees.interest > 0 && (
                                          <p className="text-destructive">+ {formatCurrency(lateFees.interest)} juros ({lateFees.daysLate}d)</p>
                                        )}
                                        <p className="font-bold text-destructive">{formatCurrency(lateFees.total)}</p>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex flex-col items-end gap-1.5">
                                    {payment.receipt_url ? (
                                      <>
                                        <ReceiptProgress 
                                          status={payment.receipt_status as any} 
                                          hasReceipt={!!payment.receipt_url} 
                                        />
                                        <div className="flex items-center gap-1.5">
                                          <ReceiptStatusBadge status={payment.receipt_status as any} />
                                          <ReceiptViewButton receiptUrl={payment.receipt_url} />
                                        </div>
                                        {payment.receipt_status === "rejeitado" && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openUploadDialog(payment)}
                                            className="text-xs animate-fade-in border-destructive/30 text-destructive hover:bg-destructive/10"
                                          >
                                            <Upload className="h-3 w-3 mr-1" />
                                            Reenviar
                                          </Button>
                                        )}
                                      </>
                                    ) : payment.status !== "pago" ? (
                                      <div className="flex flex-col items-end gap-1.5">
                                        <Button
                                          variant="default"
                                          size="sm"
                                          onClick={() => setPixDialogPayment(payment)}
                                          className="hover-scale"
                                        >
                                          <QrCode className="h-4 w-4 mr-1" />
                                          Pagar
                                        </Button>
                                      </div>
                                    ) : (
                                      <Badge variant="outline" className="text-xs gap-1 bg-success/10 text-success border-success/20">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Confirmado
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="shadow-sm animate-fade-in">
          <CardContent className="text-center py-16">
            <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
              <CreditCard className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium">Nenhuma mensalidade registrada.</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Seus pagamentos aparecerão aqui.</p>
          </CardContent>
        </Card>
      )}

      {/* Upload Dialog (kept for rejected resubmissions) */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              Reenviar Comprovante
            </DialogTitle>
            <DialogDescription>
              {selectedPayment && (
                <>Pagamento de {formatMonth(selectedPayment.reference_month)} - {formatCurrency(selectedPayment.amount)}</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div 
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10 animate-pulse">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">Enviando comprovante...</p>
                </div>
              ) : (
                <>
                  <div className="p-3 rounded-full bg-muted/50 w-fit mx-auto mb-3">
                    <FileImage className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">Clique para selecionar o comprovante</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG, WEBP ou PDF (máx. 5MB)
                  </p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Pix QR Code Payment Dialog */}
      <Dialog open={!!pixDialogPayment} onOpenChange={(open) => !open && setPixDialogPayment(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <QrCode className="h-5 w-5 text-primary" />
              </div>
              Pagar via Pix
            </DialogTitle>
            <DialogDescription>
              {pixDialogPayment && (
                <>Pagamento de {formatMonth(pixDialogPayment.reference_month)} — vencimento {format(parseISO(pixDialogPayment.due_date), "dd/MM/yyyy")}</>
              )}
            </DialogDescription>
          </DialogHeader>

          {pixDialogPayment && (dojoData as any)?.pix_key && (
            <div className="space-y-4">
              <PixQRCodePayment
                pixKey={(dojoData as any).pix_key}
                amount={(() => {
                  const fees = calculateLateFees(pixDialogPayment);
                  return fees ? fees.total : pixDialogPayment.amount;
                })()}
                merchantName={(dojoData as any)?.name || "Dojo"}
                description={`Ref ${pixDialogPayment.reference_month}`}
              />

              {/* Late fee breakdown */}
              {(() => {
                const fees = calculateLateFees(pixDialogPayment);
                if (!fees) return null;
                return (
                  <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-xl text-sm space-y-1">
                    <p className="font-medium text-destructive">Detalhamento com multa/juros:</p>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Valor original:</span>
                      <span>{formatCurrency(pixDialogPayment.amount)}</span>
                    </div>
                    {fees.fee > 0 && (
                      <div className="flex justify-between text-destructive/80">
                        <span>Multa:</span>
                        <span>+ {formatCurrency(fees.fee)}</span>
                      </div>
                    )}
                    {fees.interest > 0 && (
                      <div className="flex justify-between text-destructive/80">
                        <span>Juros ({fees.daysLate} dias):</span>
                        <span>+ {formatCurrency(fees.interest)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-destructive border-t border-destructive/20 pt-1">
                      <span>Total:</span>
                      <span>{formatCurrency(fees.total)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Upload receipt in same dialog */}
              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium text-foreground">Após pagar, envie o comprovante:</p>
                <div 
                  className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
                  onClick={() => {
                    setSelectedPayment(pixDialogPayment);
                    fileInputRef.current?.click();
                  }}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Enviando...</p>
                    </div>
                  ) : (
                    <>
                      <FileImage className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium">Enviar comprovante</p>
                      <p className="text-xs text-muted-foreground">JPG, PNG, WEBP ou PDF (máx. 5MB)</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (!selectedPayment) setSelectedPayment(pixDialogPayment);
                    handleFileSelect(e);
                  }}
                  disabled={uploading}
                />
              </div>
            </div>
          )}

          {pixDialogPayment && !(dojoData as any)?.pix_key && (
            <div className="flex flex-col items-center gap-3 p-6 text-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive font-medium">
                Chave Pix não configurada pelo dojo. Entre em contato com a administração.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
    </RequireApproval>
  );
}

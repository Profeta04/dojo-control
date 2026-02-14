import { useState, useRef, useMemo, useEffect } from "react";
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
  Upload, Loader2, FileImage, DollarSign
} from "lucide-react";
import { ReceiptViewButton } from "@/components/payments/ReceiptViewButton";
import { ReceiptStatusBadge } from "@/components/payments/ReceiptStatusBadge";
import { ReceiptProgress } from "@/components/payments/ReceiptProgress";
import { PaymentStatsCards } from "@/components/payments/PaymentStatsCards";
import { Tables } from "@/integrations/supabase/types";
import { format, parseISO, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PaymentStatus, PAYMENT_STATUS_LABELS } from "@/lib/constants";

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

  // Fetch PIX key from the student's dojo
  const { data: dojoData } = useQuery({
    queryKey: ["student-dojo-pix", profile?.dojo_id],
    queryFn: async () => {
      if (!profile?.dojo_id) return null;
      const { data, error } = await supabase
        .from("dojos")
        .select("pix_key, name")
        .eq("id", profile.dojo_id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!profile?.dojo_id,
  });

  const pixKey = (dojoData as any)?.pix_key || "Chave Pix não configurada";

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

  // Stats
  const stats = useMemo(() => ({
    total: payments?.length || 0,
    pendente: payments?.filter((p) => p.status === "pendente").length || 0,
    atrasado: payments?.filter((p) => p.status === "atrasado").length || 0,
    pago: payments?.filter((p) => p.status === "pago").length || 0,
    totalPendente: payments?.filter((p) => p.status === "pendente" || p.status === "atrasado").reduce((acc, p) => acc + p.amount, 0) || 0,
  }), [payments]);

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
      <PageHeader title="Mensalidade" description="Informações sobre seus pagamentos" />

      {/* Stats Cards */}
      <PaymentStatsCards stats={stats} formatCurrency={formatCurrency} variant="student" />

      {/* Pix Payment Card */}
      <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent shadow-sm hover-scale animate-fade-in overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <QrCode className="h-5 w-5 text-primary" />
            </div>
            Pagar via Pix
          </CardTitle>
          <CardDescription>
            Use a chave Pix abaixo para realizar o pagamento
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

          <div className="p-3 bg-warning/10 border border-warning/20 rounded-xl">
            <p className="text-sm text-warning-foreground">
              <strong>Importante:</strong> Após o pagamento, envie o comprovante na tabela abaixo.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pending Amount Alert */}
      {stats.totalPendente > 0 && (
        <Card className="mb-6 border-warning/30 bg-gradient-to-r from-warning/10 via-warning/5 to-transparent shadow-sm animate-fade-in">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-warning-foreground font-medium">
                Valor Pendente Total
              </CardDescription>
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
      <Card className="animate-fade-in shadow-sm" style={{ animationDelay: "200ms" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Histórico de Mensalidades
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {payments && payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Referência</TableHead>
                  <TableHead className="hidden sm:table-cell">Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Comprovante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment, index) => {
                  const statusStyle = STATUS_STYLES[payment.status];
                  const StatusIcon = statusStyle.icon;

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
                          <p className="text-xs text-muted-foreground sm:hidden">
                            {format(parseISO(payment.due_date), "dd/MM/yyyy")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {format(parseISO(payment.due_date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="font-semibold text-sm">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusStyle.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {PAYMENT_STATUS_LABELS[payment.status]}
                        </Badge>
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openUploadDialog(payment)}
                              className="hover-scale"
                            >
                              <Upload className="h-4 w-4 mr-1" />
                              Enviar
                            </Button>
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
          ) : (
            <div className="text-center py-16">
              <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                <CreditCard className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground font-medium">Nenhuma mensalidade registrada.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Seus pagamentos aparecerão aqui.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              Enviar Comprovante
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

            <div className="p-3 bg-muted/30 rounded-xl border border-border/50">
              <p className="text-xs text-muted-foreground">
                💡 Envie uma foto ou print do comprovante Pix. Após a verificação pelo sensei, o status será atualizado automaticamente.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
    </RequireApproval>
  );
}

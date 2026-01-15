import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Copy,
  QrCode,
  Mail,
  Upload,
  Loader2,
  FileImage,
  ExternalLink
} from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PaymentStatus, PAYMENT_STATUS_LABELS } from "@/lib/constants";

type Payment = Tables<"payments">;

const PIX_KEY = "etorevasconcelos36@gmail.com";

const STATUS_STYLES: Record<PaymentStatus, { variant: "default" | "secondary" | "destructive"; icon: typeof CheckCircle2 }> = {
  pago: { variant: "default", icon: CheckCircle2 },
  pendente: { variant: "secondary", icon: Clock },
  atrasado: { variant: "destructive", icon: AlertTriangle },
};

export default function StudentPaymentsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [copied, setCopied] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch student's payments
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
    try {
      await navigator.clipboard.writeText(PIX_KEY);
      setCopied(true);
      toast({
        title: "Chave Pix copiada!",
        description: "Cole no seu aplicativo de banco para fazer o pagamento.",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar a chave Pix.",
        variant: "destructive",
      });
    }
  };

  const openUploadDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setUploadDialogOpen(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPayment || !user) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Envie uma imagem (JPG, PNG, WEBP) ou PDF.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${selectedPayment.id}-${Date.now()}.${fileExt}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from("payment-receipts")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("payment-receipts")
        .getPublicUrl(fileName);

      // Update payment with receipt URL
      const { error: updateError } = await supabase
        .from("payments")
        .update({ receipt_url: urlData.publicUrl })
        .eq("id", selectedPayment.id);

      if (updateError) throw updateError;

      toast({
        title: "Comprovante enviado!",
        description: "Seu comprovante foi enviado e está aguardando verificação.",
      });

      setUploadDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["student-payments", user.id] });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar",
        description: error.message || "Não foi possível enviar o comprovante.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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
  const pendingPayments = payments?.filter((p) => p.status === "pendente" || p.status === "atrasado") || [];
  const totalPending = pendingPayments.reduce((acc, p) => acc + p.amount, 0);

  if (authLoading || paymentsLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <PageHeader 
        title="Mensalidade" 
        description="Informações sobre seus pagamentos" 
      />

      {/* Pix Payment Card */}
      <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            Pagar via Pix
          </CardTitle>
          <CardDescription>
            Use a chave Pix abaixo para realizar o pagamento da sua mensalidade
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
            <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <code className="flex-1 text-sm font-mono break-all">
              {PIX_KEY}
            </code>
            <Button
              variant={copied ? "default" : "outline"}
              size="sm"
              onClick={handleCopyPix}
              className="flex-shrink-0"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copiar
                </>
              )}
            </Button>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Importante:</strong> Após realizar o pagamento, envie o comprovante clicando no botão "Enviar Comprovante" na tabela abaixo.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pending Amount Alert */}
      {totalPending > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-amber-700 dark:text-amber-300">
                Valor Pendente Total
              </CardDescription>
              <CreditCard className="h-5 w-5 text-amber-600" />
            </div>
            <CardTitle className="text-2xl text-amber-700 dark:text-amber-300">
              {formatCurrency(totalPending)}
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      {/* Payments Table */}
      <Card>
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
                <TableRow>
                  <TableHead>Referência</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Comprovante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => {
                  const statusStyle = STATUS_STYLES[payment.status];
                  const StatusIcon = statusStyle.icon;

                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="capitalize font-medium">
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
                      <TableCell className="text-right">
                        {payment.receipt_url ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a 
                              href={payment.receipt_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="gap-1"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Ver
                            </a>
                          </Button>
                        ) : payment.status !== "pago" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openUploadDialog(payment)}
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            Enviar
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                Nenhuma mensalidade registrada.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
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
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Enviando...</p>
                </div>
              ) : (
                <>
                  <FileImage className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
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

            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                💡 Envie uma foto ou print do comprovante de pagamento Pix. 
                Após a verificação, o status será atualizado.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Copy,
  QrCode,
  Mail
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
  const [copied, setCopied] = useState(false);

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
              <strong>Importante:</strong> Após realizar o pagamento, aguarde a confirmação pelo sistema. 
              O status será atualizado automaticamente após a verificação.
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
    </DashboardLayout>
  );
}

import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { GuardianPasswordGate } from "@/components/auth/GuardianPasswordGate";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CheckCircle2, CreditCard, Tag } from "lucide-react";
import { ReceiptViewButton } from "@/components/payments/ReceiptViewButton";
import { ReceiptStatusBadge } from "@/components/payments/ReceiptStatusBadge";
import { Tables } from "@/integrations/supabase/types";
import { format, parseISO, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PAYMENT_CATEGORY_LABELS, PaymentCategory } from "@/lib/constants";

type Payment = Tables<"payments">;

export default function StudentPaymentHistory() {
  const { user, profile, loading: authLoading } = useAuth();
  const [guardianVerified, setGuardianVerified] = useState(false);

  const isMinorWithGuardian = useMemo(() => {
    if (!profile?.birth_date || !profile?.guardian_email) return false;
    const age = differenceInYears(new Date(), new Date(profile.birth_date));
    return age < 18;
  }, [profile]);

  useEffect(() => {
    const stored = sessionStorage.getItem("guardian_verified");
    if (stored) {
      try {
        const { expiry } = JSON.parse(stored);
        if (Date.now() < expiry) setGuardianVerified(true);
        else sessionStorage.removeItem("guardian_verified");
      } catch { sessionStorage.removeItem("guardian_verified"); }
    }
  }, []);

  const { data: payments, isLoading } = useQuery({
    queryKey: ["student-payments-history", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("student_id", user.id)
        .eq("status", "pago")
        .order("due_date", { ascending: false });
      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!user,
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatMonth = (monthStr: string | null) => {
    if (!monthStr) return "—";
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return format(date, "MMMM 'de' yyyy", { locale: ptBR });
  };

  if (authLoading || isLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  if (isMinorWithGuardian && !guardianVerified) {
    return (
      <DashboardLayout>
        <GuardianPasswordGate
          guardianEmail={profile?.guardian_email || ""}
          onSuccess={() => setGuardianVerified(true)}
          title="Histórico de Pagamentos"
          description="Acesso restrito para maiores de idade"
        />
      </DashboardLayout>
    );
  }

  const totalPaid = payments?.reduce((acc, p) => acc + p.amount, 0) || 0;

  return (
    <RequireApproval>
      <DashboardLayout>
        <PageHeader title="Histórico de Pagamentos" description="Pagamentos já confirmados" />

        {/* Summary */}
        <Card className="mb-6 border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
          <CardContent className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Total pago</p>
                <p className="text-xs text-muted-foreground">{payments?.length || 0} pagamentos confirmados</p>
              </div>
            </div>
            <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>

        {payments && payments.length > 0 ? (
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead>Referência</TableHead>
                      <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                      <TableHead className="hidden sm:table-cell">Pago em</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead className="text-right">Comprovante</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id} className="hover:bg-muted/30 transition-colors">
                         <TableCell>
                          <div>
                            <p className="capitalize font-medium text-sm">
                              {formatMonth(payment.reference_month)}
                            </p>
                            <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0 mt-1 sm:hidden w-fit">
                              <Tag className="h-2.5 w-2.5" />
                              {PAYMENT_CATEGORY_LABELS[payment.category as PaymentCategory] || payment.category}
                            </Badge>
                            {payment.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{payment.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground sm:hidden mt-0.5">
                              {payment.paid_date
                                ? format(parseISO(payment.paid_date), "dd/MM/yyyy")
                                : "—"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className="text-xs gap-1 w-fit">
                              <Tag className="h-3 w-3" />
                              {PAYMENT_CATEGORY_LABELS[payment.category as PaymentCategory] || payment.category}
                            </Badge>
                            {payment.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{payment.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {payment.paid_date
                            ? format(parseISO(payment.paid_date), "dd/MM/yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold text-sm">{formatCurrency(payment.amount)}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          {payment.receipt_url ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <ReceiptStatusBadge status={payment.receipt_status as any} />
                              <ReceiptViewButton receiptUrl={payment.receipt_url} />
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-xs gap-1 bg-green-500/10 text-green-600 border-green-500/20">
                              <CheckCircle2 className="h-3 w-3" />
                              Confirmado
                            </Badge>
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
          <Card>
            <CardContent className="text-center py-16">
              <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                <CreditCard className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground font-medium">Nenhum pagamento confirmado ainda.</p>
            </CardContent>
          </Card>
        )}
      </DashboardLayout>
    </RequireApproval>
  );
}
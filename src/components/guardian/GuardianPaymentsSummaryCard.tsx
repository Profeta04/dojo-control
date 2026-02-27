import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGuardianMinors } from "@/hooks/useGuardianMinors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Payment = Tables<"payments">;

interface MinorPaymentSummary {
  minorName: string;
  pending: number;
  overdue: number;
  paid: number;
  totalPending: number;
}

export function GuardianPaymentsSummaryCard() {
  const { minors, loading: minorsLoading } = useGuardianMinors();
  const [summaries, setSummaries] = useState<MinorPaymentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (minorsLoading || minors.length === 0) {
      setLoading(false);
      return;
    }

    const fetchPayments = async () => {
      const results: MinorPaymentSummary[] = [];

      for (const minor of minors) {
        const { data } = await supabase
          .from("payments")
          .select("status, amount")
          .eq("student_id", minor.user_id);

        const payments = data || [];
        const pending = payments.filter(p => p.status === "pendente");
        const overdue = payments.filter(p => p.status === "atrasado");
        const paid = payments.filter(p => p.status === "pago");

        results.push({
          minorName: minor.name,
          pending: pending.length,
          overdue: overdue.length,
          paid: paid.length,
          totalPending: [...pending, ...overdue].reduce((sum, p) => sum + Number(p.amount), 0),
        });
      }

      setSummaries(results);
      setLoading(false);
    };

    fetchPayments();
  }, [minors, minorsLoading]);

  if (loading || summaries.length === 0) return null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const totalOverdue = summaries.reduce((s, m) => s + m.overdue, 0);
  const totalPending = summaries.reduce((s, m) => s + m.pending, 0);

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <CreditCard className="h-5 w-5 text-accent" />
          Resumo Financeiro dos Dependentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {totalOverdue > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm font-medium text-destructive">
              {totalOverdue} pagamento{totalOverdue > 1 ? "s" : ""} em atraso
            </p>
          </div>
        )}

        <div className="space-y-4">
          {summaries.map((summary) => (
            <div key={summary.minorName} className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">{summary.minorName}</p>
                {summary.totalPending > 0 && (
                  <span className="text-sm font-bold text-warning">
                    {formatCurrency(summary.totalPending)} pendente
                  </span>
                )}
              </div>
              <div className="flex gap-3 flex-wrap">
                {summary.overdue > 0 && (
                  <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                    <AlertTriangle className="h-3 w-3" />
                    {summary.overdue} atrasado{summary.overdue > 1 ? "s" : ""}
                  </Badge>
                )}
                {summary.pending > 0 && (
                  <Badge variant="outline" className="flex items-center gap-1 text-xs text-warning border-warning/30">
                    <Clock className="h-3 w-3" />
                    {summary.pending} pendente{summary.pending > 1 ? "s" : ""}
                  </Badge>
                )}
                {summary.paid > 0 && (
                  <Badge variant="outline" className="flex items-center gap-1 text-xs text-success border-success/30">
                    <CheckCircle className="h-3 w-3" />
                    {summary.paid} pago{summary.paid > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

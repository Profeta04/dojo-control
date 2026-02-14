import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useDojoContext } from "@/hooks/useDojoContext";
import { Tables } from "@/integrations/supabase/types";
import { generateFinancialReport, FinancialReportData } from "@/lib/generateFinancialReport";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type Payment = Tables<"payments">;

interface ExportFinancialReportButtonProps {
  payments: (Payment & { studentName: string })[];
}

export function ExportFinancialReportButton({ payments }: ExportFinancialReportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { userDojos, currentDojoId } = useDojoContext();

  const handleExport = () => {
    setIsGenerating(true);

    try {
      const now = new Date();
      const currentMonth = format(now, "yyyy-MM");
      const currentMonthLabel = format(now, "MMMM 'de' yyyy", { locale: ptBR });
      const currentDojo = userDojos.find((d) => d.id === currentDojoId) || userDojos[0];
      const dojoName = currentDojo?.name || "Dojo";

      // Calculate totals
      const totalRecebido = payments
        .filter((p) => p.status === "pago")
        .reduce((acc, p) => acc + p.amount, 0);
      const totalPendente = payments
        .filter((p) => p.status === "pendente")
        .reduce((acc, p) => acc + p.amount, 0);
      const totalAtrasado = payments
        .filter((p) => p.status === "atrasado")
        .reduce((acc, p) => acc + p.amount, 0);
      const totalGeral = totalRecebido + totalPendente + totalAtrasado;
      const delinquencyRate =
        payments.length > 0
          ? (payments.filter((p) => p.status === "atrasado").length / payments.length) * 100
          : 0;

      // Monthly revenue (last 6 months)
      const monthlyRevenue = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(now, i);
        const monthStr = format(date, "yyyy-MM");
        const monthLabel = format(date, "MMM", { locale: ptBR });

        const monthPayments = payments.filter((p) => {
          if (!p.reference_month) return false;
          return p.reference_month.substring(0, 7) === monthStr;
        });

        monthlyRevenue.push({
          monthLabel,
          recebido: monthPayments.filter((p) => p.status === "pago").reduce((a, p) => a + p.amount, 0),
          pendente: monthPayments.filter((p) => p.status === "pendente").reduce((a, p) => a + p.amount, 0),
          atrasado: monthPayments.filter((p) => p.status === "atrasado").reduce((a, p) => a + p.amount, 0),
        });
      }

      // Payment details sorted by due_date desc
      const sortedPayments = [...payments].sort(
        (a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
      );

      const reportData: FinancialReportData = {
        dojoName,
        referenceMonth: currentMonth,
        referenceMonthLabel: currentMonthLabel.charAt(0).toUpperCase() + currentMonthLabel.slice(1),
        totalRecebido,
        totalPendente,
        totalAtrasado,
        totalGeral,
        delinquencyRate,
        monthlyRevenue,
        payments: sortedPayments.map((p) => ({
          studentName: p.studentName,
          referenceMonth: p.reference_month
            ? format(new Date(p.reference_month + (p.reference_month.length <= 7 ? "-01" : "")), "MMM/yyyy", { locale: ptBR })
            : "—",
          amount: p.amount,
          status: p.status || "pendente",
          dueDate: format(new Date(p.due_date), "dd/MM/yyyy"),
          paidDate: p.paid_date ? format(new Date(p.paid_date), "dd/MM/yyyy") : null,
        })),
      };

      const fileName = generateFinancialReport(reportData);
      toast.success(`Relatório "${fileName}" gerado com sucesso!`);
    } catch (error) {
      console.error("Error generating financial report:", error);
      toast.error("Erro ao gerar relatório financeiro.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={isGenerating}>
      {isGenerating ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4 mr-2" />
      )}
      <span className="hidden sm:inline">Relatório</span> PDF
    </Button>
  );
}

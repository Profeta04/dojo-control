import { useState } from "react";
import { Button } from "@/components/ui/button";
import { fetchLogoAsBase64 } from "@/lib/fetchLogoForPdf";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const { userDojos, currentDojoId } = useDojoContext();

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    const value = format(date, "yyyy-MM");
    const label = format(date, "MMMM yyyy", { locale: ptBR });
    return { value, label: label.charAt(0).toUpperCase() + label.slice(1) };
  });

  const handleExport = async () => {
    setIsGenerating(true);
    try {
      const [refYear, refMonth] = selectedMonth.split("-").map(Number);
      const refDate = new Date(refYear, refMonth - 1, 15);
      const refMonthLabel = format(refDate, "MMMM 'de' yyyy", { locale: ptBR });
      const currentDojo = userDojos.find((d) => d.id === currentDojoId) || userDojos[0];

      const totalRecebido = payments.filter((p) => p.status === "pago").reduce((a, p) => a + p.amount, 0);
      const totalPendente = payments.filter((p) => p.status === "pendente").reduce((a, p) => a + p.amount, 0);
      const totalAtrasado = payments.filter((p) => p.status === "atrasado").reduce((a, p) => a + p.amount, 0);
      const totalGeral = totalRecebido + totalPendente + totalAtrasado;
      const delinquencyRate = payments.length > 0
        ? (payments.filter((p) => p.status === "atrasado").length / payments.length) * 100
        : 0;

      const monthlyRevenue = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(refDate, i);
        const monthStr = format(date, "yyyy-MM");
        const monthLabel = format(date, "MMM", { locale: ptBR });
        const mPayments = payments.filter((p) => p.reference_month?.substring(0, 7) === monthStr);
        monthlyRevenue.push({
          monthLabel,
          recebido: mPayments.filter((p) => p.status === "pago").reduce((a, p) => a + p.amount, 0),
          pendente: mPayments.filter((p) => p.status === "pendente").reduce((a, p) => a + p.amount, 0),
          atrasado: mPayments.filter((p) => p.status === "atrasado").reduce((a, p) => a + p.amount, 0),
        });
      }

      const sortedPayments = [...payments].sort(
        (a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
      );

      const reportData: FinancialReportData = {
        dojoInfo: {
          dojoName: currentDojo?.name || "Dojo",
          logoUrl: currentDojo?.logo_url,
          primaryColor: currentDojo?.color_primary,
          secondaryColor: currentDojo?.color_secondary,
          accentColor: currentDojo?.color_accent,
        },
        referenceMonth: selectedMonth,
        referenceMonthLabel: refMonthLabel.charAt(0).toUpperCase() + refMonthLabel.slice(1),
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

      const logoBase64 = await fetchLogoAsBase64(currentDojo?.logo_url);
      const fileName = generateFinancialReport(reportData, logoBase64);
      toast.success(`Relatório "${fileName}" gerado com sucesso!`);
      setIsOpen(false);
    } catch (error) {
      console.error("Error generating financial report:", error);
      toast.error("Erro ao gerar relatório financeiro.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileDown className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Relatório</span> PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Exportar Relatório Financeiro</DialogTitle>
          <DialogDescription>
            Selecione o mês de referência para o relatório em PDF.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o mês" />
            </SelectTrigger>
            <SelectContent className="z-[200] max-h-[300px]" position="popper">
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
          <Button onClick={handleExport} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
            Gerar PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

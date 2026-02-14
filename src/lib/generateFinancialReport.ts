import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface FinancialReportData {
  dojoName: string;
  referenceMonth: string; // "2026-02"
  referenceMonthLabel: string; // "Fevereiro 2026"

  // Summary
  totalRecebido: number;
  totalPendente: number;
  totalAtrasado: number;
  totalGeral: number;
  delinquencyRate: number;

  // Monthly breakdown (last 6 months)
  monthlyRevenue: Array<{
    monthLabel: string;
    recebido: number;
    pendente: number;
    atrasado: number;
  }>;

  // Detailed payment list
  payments: Array<{
    studentName: string;
    referenceMonth: string;
    amount: number;
    status: string;
    dueDate: string;
    paidDate: string | null;
  }>;
}

const STATUS_LABELS: Record<string, string> = {
  pago: "Pago",
  pendente: "Pendente",
  atrasado: "Atrasado",
};

const formatCurrency = (value: number) =>
  `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

export function generateFinancialReport(data: FinancialReportData): string {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  // Header
  doc.setFontSize(22);
  doc.setTextColor(20, 20, 20);
  doc.text("💰 Relatório Financeiro", pageWidth / 2, 22, { align: "center" });

  doc.setFontSize(13);
  doc.setTextColor(80, 80, 80);
  doc.text(data.dojoName, pageWidth / 2, 30, { align: "center" });

  doc.setFontSize(11);
  doc.setTextColor(120, 120, 120);
  doc.text(`Referência: ${data.referenceMonthLabel}`, pageWidth / 2, 37, { align: "center" });

  doc.setFontSize(9);
  doc.text(`Gerado em: ${today}`, pageWidth / 2, 43, { align: "center" });

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 48, pageWidth - 20, 48);

  let yPos = 58;

  // Section: Resumo Financeiro
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text("Resumo Financeiro", 20, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [["Indicador", "Valor"]],
    body: [
      ["Total Recebido (Pagos)", formatCurrency(data.totalRecebido)],
      ["Total Pendente", formatCurrency(data.totalPendente)],
      ["Total Atrasado", formatCurrency(data.totalAtrasado)],
      ["Total Geral", formatCurrency(data.totalGeral)],
      ["Taxa de Inadimplência", `${data.delinquencyRate.toFixed(1)}%`],
    ],
    theme: "striped",
    headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
    styles: { fontSize: 10 },
    margin: { left: 20, right: 20 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Section: Receita por Mês (últimos 6 meses)
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text("Receita por Mês (Últimos 6 Meses)", 20, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [["Mês", "Recebido", "Pendente", "Atrasado", "Total"]],
    body: data.monthlyRevenue.map((m) => [
      m.monthLabel.charAt(0).toUpperCase() + m.monthLabel.slice(1),
      formatCurrency(m.recebido),
      formatCurrency(m.pendente),
      formatCurrency(m.atrasado),
      formatCurrency(m.recebido + m.pendente + m.atrasado),
    ]),
    theme: "striped",
    headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
    styles: { fontSize: 9 },
    margin: { left: 20, right: 20 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Section: Detalhamento de Pagamentos
  if (data.payments.length > 0) {
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(20, 20, 20);
    doc.text("Detalhamento de Pagamentos", 20, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [["Aluno", "Referência", "Valor", "Status", "Vencimento", "Pagamento"]],
      body: data.payments.map((p) => [
        p.studentName,
        p.referenceMonth,
        formatCurrency(p.amount),
        STATUS_LABELS[p.status] || p.status,
        p.dueDate,
        p.paidDate || "—",
      ]),
      theme: "striped",
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 40 },
        3: { cellWidth: 22 },
      },
      margin: { left: 15, right: 15 },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `${data.dojoName} - Relatório Financeiro - Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  const fileName = `relatorio-financeiro-${data.referenceMonth}.pdf`;
  doc.save(fileName);
  return fileName;
}

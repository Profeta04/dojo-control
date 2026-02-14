import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface FinancialReportData {
  dojoName: string;
  referenceMonth: string;
  referenceMonthLabel: string;
  totalRecebido: number;
  totalPendente: number;
  totalAtrasado: number;
  totalGeral: number;
  delinquencyRate: number;
  monthlyRevenue: Array<{
    monthLabel: string;
    recebido: number;
    pendente: number;
    atrasado: number;
  }>;
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

function drawBarChart(
  doc: jsPDF,
  data: FinancialReportData["monthlyRevenue"],
  startX: number,
  startY: number,
  chartWidth: number,
  chartHeight: number
) {
  const maxValue = Math.max(
    ...data.map((m) => m.recebido + m.pendente + m.atrasado),
    1
  );
  const barGroupWidth = chartWidth / data.length;
  const barWidth = barGroupWidth * 0.2;
  const gap = barGroupWidth * 0.05;
  const colors = {
    recebido: { r: 34, g: 139, b: 34 },   // green
    pendente: { r: 50, g: 50, b: 50 },     // dark gray
    atrasado: { r: 220, g: 53, b: 69 },    // red
  };

  // Draw axes
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.line(startX, startY, startX, startY + chartHeight); // Y axis
  doc.line(startX, startY + chartHeight, startX + chartWidth, startY + chartHeight); // X axis

  // Draw Y-axis labels (5 ticks)
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  for (let i = 0; i <= 4; i++) {
    const val = (maxValue / 4) * (4 - i);
    const yTick = startY + (chartHeight / 4) * i;
    doc.setDrawColor(230, 230, 230);
    doc.line(startX, yTick, startX + chartWidth, yTick); // grid line
    doc.text(formatCurrency(val), startX - 2, yTick + 2, { align: "right" });
  }

  // Draw bars for each month
  data.forEach((month, i) => {
    const groupX = startX + i * barGroupWidth + barGroupWidth * 0.15;

    const values = [
      { val: month.recebido, color: colors.recebido },
      { val: month.pendente, color: colors.pendente },
      { val: month.atrasado, color: colors.atrasado },
    ];

    values.forEach((v, j) => {
      const barHeight = (v.val / maxValue) * chartHeight;
      const x = groupX + j * (barWidth + gap);
      const y = startY + chartHeight - barHeight;

      doc.setFillColor(v.color.r, v.color.g, v.color.b);
      doc.rect(x, y, barWidth, barHeight, "F");
    });

    // Month label
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    const labelX = groupX + (3 * (barWidth + gap) - gap) / 2;
    doc.text(
      month.monthLabel.charAt(0).toUpperCase() + month.monthLabel.slice(1),
      labelX,
      startY + chartHeight + 8,
      { align: "center" }
    );
  });

  // Legend
  const legendY = startY + chartHeight + 16;
  const legendItems = [
    { label: "Recebido", color: colors.recebido },
    { label: "Pendente", color: colors.pendente },
    { label: "Atrasado", color: colors.atrasado },
  ];
  let legendX = startX + 10;
  doc.setFontSize(8);
  legendItems.forEach((item) => {
    doc.setFillColor(item.color.r, item.color.g, item.color.b);
    doc.rect(legendX, legendY - 3, 6, 4, "F");
    doc.setTextColor(60, 60, 60);
    doc.text(item.label, legendX + 8, legendY);
    legendX += 40;
  });
}

export function generateFinancialReport(data: FinancialReportData): string {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  // Header
  doc.setFontSize(22);
  doc.setTextColor(20, 20, 20);
  doc.text("Relatorio Financeiro", pageWidth / 2, 22, { align: "center" });

  doc.setFontSize(13);
  doc.setTextColor(80, 80, 80);
  doc.text(data.dojoName, pageWidth / 2, 30, { align: "center" });

  doc.setFontSize(11);
  doc.setTextColor(120, 120, 120);
  doc.text(`Referencia: ${data.referenceMonthLabel}`, pageWidth / 2, 37, { align: "center" });

  doc.setFontSize(9);
  doc.text(`Gerado em: ${today}`, pageWidth / 2, 43, { align: "center" });

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
      ["Taxa de Inadimplencia", `${data.delinquencyRate.toFixed(1)}%`],
    ],
    theme: "striped",
    headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
    styles: { fontSize: 10 },
    margin: { left: 20, right: 20 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Section: Visual Bar Chart
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text("Receita por Mes (Ultimos 6 Meses)", 20, yPos);
  yPos += 8;

  const chartHeight = 65;
  const chartWidth = pageWidth - 70;

  // Check if chart fits on current page
  if (yPos + chartHeight + 25 > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    yPos = 20;
    doc.setFontSize(14);
    doc.setTextColor(20, 20, 20);
    doc.text("Receita por Mes (Ultimos 6 Meses)", 20, yPos);
    yPos += 8;
  }

  drawBarChart(doc, data.monthlyRevenue, 40, yPos, chartWidth, chartHeight);
  yPos += chartHeight + 28;

  // Section: Monthly Revenue Table
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text("Detalhamento Mensal", 20, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [["Mes", "Recebido", "Pendente", "Atrasado", "Total"]],
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

  // Section: Payment Details
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
      head: [["Aluno", "Referencia", "Valor", "Status", "Vencimento", "Pagamento"]],
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
      `${data.dojoName} - Relatorio Financeiro - Pagina ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  const fileName = `relatorio-financeiro-${data.referenceMonth}.pdf`;
  doc.save(fileName);
  return fileName;
}

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PdfDojoInfo, resolveDojoColors } from "./pdfTheme";

export interface FinancialReportData {
  dojoInfo: PdfDojoInfo;
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
    recebido: { r: 34, g: 139, b: 34 },
    pendente: { r: 50, g: 50, b: 50 },
    atrasado: { r: 220, g: 53, b: 69 },
  };

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.line(startX, startY, startX, startY + chartHeight);
  doc.line(startX, startY + chartHeight, startX + chartWidth, startY + chartHeight);

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  for (let i = 0; i <= 4; i++) {
    const val = (maxValue / 4) * (4 - i);
    const yTick = startY + (chartHeight / 4) * i;
    doc.setDrawColor(230, 230, 230);
    doc.line(startX, yTick, startX + chartWidth, yTick);
    doc.text(formatCurrency(val), startX - 2, yTick + 2, { align: "right" });
  }

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

export function generateFinancialReport(data: FinancialReportData, logoBase64?: string | null): string {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const { headerBg, accentBg, lightBg } = resolveDojoColors(data.dojoInfo);
  const dojoName = data.dojoInfo.dojoName || "Dojo";

  // Helper: section title with accent underline
  const drawSectionTitle = (title: string, y: number) => {
    doc.setFontSize(13);
    doc.setTextColor(headerBg[0], headerBg[1], headerBg[2]);
    doc.text(title, 20, y);
    doc.setDrawColor(accentBg[0], accentBg[1], accentBg[2]);
    doc.setLineWidth(1.5);
    doc.line(20, y + 2, 20 + doc.getTextWidth(title), y + 2);
    doc.setLineWidth(0.5);
  };

  // ── Header ──
  const headerHeight = logoBase64 ? 52 : 44;
  doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", 14, 8, 28, 28);
    } catch { /* logo failed */ }
  }

  const textX = logoBase64 ? pageWidth / 2 + 10 : pageWidth / 2;
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("Relatório Financeiro", textX, 16, { align: "center" });

  doc.setFontSize(13);
  doc.text(dojoName, textX, 25, { align: "center" });

  doc.setFontSize(11);
  doc.text(`Referência: ${data.referenceMonthLabel}`, textX, 33, { align: "center" });

  doc.setFontSize(9);
  doc.text(`Gerado em: ${today}`, textX, 40, { align: "center" });

  let yPos = headerHeight + 10;

  // ── Resumo Financeiro ──
  drawSectionTitle("Resumo Financeiro", yPos);
  yPos += 9;

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
    headStyles: { fillColor: headerBg, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: lightBg },
    styles: { fontSize: 10, cellPadding: 4 },
    margin: { left: 20, right: 20 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 12;

  // ── Gráfico de Barras ──
  drawSectionTitle("Receita por Mês (Últimos 6 Meses)", yPos);
  yPos += 10;

  const chartHeight = 65;
  const chartWidth = pageWidth - 70;

  if (yPos + chartHeight + 25 > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    yPos = 20;
    drawSectionTitle("Receita por Mês (Últimos 6 Meses)", yPos);
    yPos += 10;
  }

  drawBarChart(doc, data.monthlyRevenue, 40, yPos, chartWidth, chartHeight);
  yPos += chartHeight + 28;

  // ── Detalhamento Mensal ──
  drawSectionTitle("Detalhamento Mensal", yPos);
  yPos += 9;

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
    headStyles: { fillColor: headerBg, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: lightBg },
    styles: { fontSize: 9, cellPadding: 4 },
    margin: { left: 20, right: 20 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 12;

  // ── Detalhamento de Pagamentos ──
  if (data.payments.length > 0) {
    if (yPos > 200) { doc.addPage(); yPos = 20; }

    drawSectionTitle("Detalhamento de Pagamentos", yPos);
    yPos += 9;

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
      headStyles: { fillColor: headerBg, textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: lightBg },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 40 }, 3: { cellWidth: 22 } },
      margin: { left: 15, right: 15 },
    });
  }

  // ── Footer ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
    doc.rect(0, pageH - 14, pageWidth, 14, "F");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `${dojoName} — Relatório Financeiro — Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageH - 5,
      { align: "center" }
    );
  }

  const fileName = `relatorio-financeiro-${data.referenceMonth}.pdf`;
  doc.save(fileName);
  return fileName;
}

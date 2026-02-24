import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  PdfDojoInfo,
  resolveDojoColors,
  drawPdfHeader,
  drawSectionTitle,
  drawMetricCards,
  drawPdfFooters,
  tableStyles,
  smallTableStyles,
  checkPageBreak,
  STATUS_COLORS,
} from "./pdfTheme";

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
    recebido: STATUS_COLORS.pago,
    pendente: STATUS_COLORS.pendente,
    atrasado: STATUS_COLORS.atrasado,
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
      doc.setFillColor(v.color[0], v.color[1], v.color[2]);
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
    doc.setFillColor(item.color[0], item.color[1], item.color[2]);
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
  const tbl = tableStyles(headerBg, lightBg);
  const smallTbl = smallTableStyles(headerBg, lightBg);

  // ── Header ──
  let yPos = drawPdfHeader(doc, {
    dojoName,
    subtitle: "Relatório Financeiro",
    extraLine: `Referência: ${data.referenceMonthLabel}`,
    dateLine: `Gerado em: ${today}`,
    headerBg,
    accentBg,
    logoBase64,
  });

  // ── Metric Cards ──
  yPos = drawMetricCards(doc, [
    { label: "Total Recebido", value: formatCurrency(data.totalRecebido), color: STATUS_COLORS.pago },
    { label: "Total Pendente", value: formatCurrency(data.totalPendente), color: STATUS_COLORS.pendente },
    { label: "Total Atrasado", value: formatCurrency(data.totalAtrasado), color: STATUS_COLORS.atrasado },
  ], yPos, headerBg);

  // ── Resumo Financeiro ──
  drawSectionTitle(doc, "Resumo Financeiro", yPos, headerBg, accentBg);
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
    ...tbl,
  });
  yPos = (doc as any).lastAutoTable.finalY + 12;

  // ── Gráfico de Barras ──
  drawSectionTitle(doc, "Receita por Mês (Últimos 6 Meses)", yPos, headerBg, accentBg);
  yPos += 10;

  const chartHeight = 65;
  const chartWidth = pageWidth - 70;

  if (yPos + chartHeight + 25 > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    yPos = 20;
    drawSectionTitle(doc, "Receita por Mês (Últimos 6 Meses)", yPos, headerBg, accentBg);
    yPos += 10;
  }

  drawBarChart(doc, data.monthlyRevenue, 40, yPos, chartWidth, chartHeight);
  yPos += chartHeight + 28;

  // ── Detalhamento Mensal ──
  drawSectionTitle(doc, "Detalhamento Mensal", yPos, headerBg, accentBg);
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
    ...tbl,
    styles: { fontSize: 9, cellPadding: 4 },
  });
  yPos = (doc as any).lastAutoTable.finalY + 12;

  // ── Detalhamento de Pagamentos ──
  if (data.payments.length > 0) {
    yPos = checkPageBreak(doc, yPos);

    drawSectionTitle(doc, "Detalhamento de Pagamentos", yPos, headerBg, accentBg);
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
      ...smallTbl,
      columnStyles: { 0: { cellWidth: 40 }, 3: { cellWidth: 22 } },
      margin: { left: 15, right: 15 },
      didParseCell: (hookData: any) => {
        // Color-code status column
        if (hookData.section === "body" && hookData.column.index === 3) {
          const status = data.payments[hookData.row.index]?.status;
          if (status && STATUS_COLORS[status]) {
            hookData.cell.styles.textColor = STATUS_COLORS[status];
            hookData.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
  }

  // ── Footer ──
  drawPdfFooters(doc, `${dojoName} — Relatório Financeiro`, headerBg);

  const fileName = `relatorio-financeiro-${data.referenceMonth}.pdf`;
  doc.save(fileName);
  return fileName;
}

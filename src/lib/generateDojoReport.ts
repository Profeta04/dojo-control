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
} from "./pdfTheme";

export interface DojoReportData {
  dojoInfo: PdfDojoInfo;
  totalStudents: number;
  activeClasses: number;
  pendingApprovals: number;
  totalSenseis: number;
  attendanceRate: number;
  presentCount: number;
  totalAttendance: number;
  monthlyAttendance: Array<{
    name: string;
    presencas: number;
    total: number;
    taxa: number;
  }>;
  totalReceived: number;
  pendingPayments: number;
  overduePayments: number;
  recentGraduations: number;
  studentsList?: Array<{
    name: string;
    email: string;
    belt: string;
    status: string;
  }>;
  classesList?: Array<{
    name: string;
    schedule: string;
    sensei: string;
    studentCount: number;
  }>;
  paymentsList?: Array<{
    studentName: string;
    referenceMonth: string;
    amount: number;
    status: string;
    dueDate: string;
  }>;
}

export function generateDojoReport(data: DojoReportData, logoBase64?: string | null) {
  const doc = new jsPDF();
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const { headerBg, accentBg, lightBg } = resolveDojoColors(data.dojoInfo);
  const dojoName = data.dojoInfo.dojoName || "Dojo";
  const tbl = tableStyles(headerBg, lightBg);
  const smallTbl = smallTableStyles(headerBg, lightBg);

  // ── Header ──
  let yPos = drawPdfHeader(doc, {
    dojoName,
    subtitle: "Relatório de Estatísticas",
    dateLine: `Gerado em: ${today}`,
    headerBg,
    accentBg,
    logoBase64,
  });

  // ── Metric Cards ──
  yPos = drawMetricCards(doc, [
    { label: "Alunos Ativos", value: data.totalStudents.toString() },
    { label: "Turmas Ativas", value: data.activeClasses.toString() },
    { label: "Taxa Presença", value: `${data.attendanceRate}%` },
    { label: "Graduações (3m)", value: data.recentGraduations.toString() },
  ], yPos, headerBg);

  // ── Resumo Geral ──
  drawSectionTitle(doc, "Resumo Geral", yPos, headerBg, accentBg);
  yPos += 9;

  autoTable(doc, {
    startY: yPos,
    head: [["Indicador", "Valor"]],
    body: [
      ["Total de Alunos Ativos", data.totalStudents.toString()],
      ["Total de Senseis", data.totalSenseis.toString()],
      ["Turmas Ativas", data.activeClasses.toString()],
      ["Aprovações Pendentes", data.pendingApprovals.toString()],
      ["Graduações Recentes (3 meses)", data.recentGraduations.toString()],
    ],
    ...tbl,
  });
  yPos = (doc as any).lastAutoTable.finalY + 12;

  // ── Presenças ──
  drawSectionTitle(doc, "Presenças do Mês Atual", yPos, headerBg, accentBg);
  yPos += 9;

  autoTable(doc, {
    startY: yPos,
    head: [["Indicador", "Valor"]],
    body: [
      ["Taxa de Presença", `${data.attendanceRate}%`],
      ["Total de Presenças", data.presentCount.toString()],
      ["Total de Ausências", (data.totalAttendance - data.presentCount).toString()],
      ["Total de Registros", data.totalAttendance.toString()],
    ],
    ...tbl,
  });
  yPos = (doc as any).lastAutoTable.finalY + 12;

  // ── Evolução Presenças ──
  drawSectionTitle(doc, "Evolução de Presenças (Últimos 6 Meses)", yPos, headerBg, accentBg);
  yPos += 9;

  autoTable(doc, {
    startY: yPos,
    head: [["Mês", "Presenças", "Total", "Taxa"]],
    body: data.monthlyAttendance.map((month) => [
      month.name.charAt(0).toUpperCase() + month.name.slice(1),
      month.presencas.toString(),
      month.total.toString(),
      `${month.taxa}%`,
    ]),
    ...tbl,
  });
  yPos = (doc as any).lastAutoTable.finalY + 12;

  yPos = checkPageBreak(doc, yPos, 240);

  // ── Situação Financeira ──
  drawSectionTitle(doc, "Situação Financeira", yPos, headerBg, accentBg);
  yPos += 9;

  autoTable(doc, {
    startY: yPos,
    head: [["Indicador", "Valor"]],
    body: [
      ["Total Recebido", `R$ ${data.totalReceived.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
      ["Pagamentos Pendentes", data.pendingPayments.toString()],
      ["Pagamentos Atrasados", data.overduePayments.toString()],
    ],
    ...tbl,
  });
  yPos = (doc as any).lastAutoTable.finalY + 12;

  // ── Optional: Lista de Alunos ──
  if (data.studentsList && data.studentsList.length > 0) {
    yPos = checkPageBreak(doc, yPos);
    drawSectionTitle(doc, "Lista de Alunos", yPos, headerBg, accentBg);
    yPos += 9;

    autoTable(doc, {
      startY: yPos,
      head: [["Nome", "Email", "Faixa", "Status"]],
      body: data.studentsList.map((s) => [s.name, s.email, s.belt, s.status]),
      ...smallTbl,
    });
    yPos = (doc as any).lastAutoTable.finalY + 12;
  }

  // ── Optional: Lista de Turmas ──
  if (data.classesList && data.classesList.length > 0) {
    yPos = checkPageBreak(doc, yPos);
    drawSectionTitle(doc, "Lista de Turmas", yPos, headerBg, accentBg);
    yPos += 9;

    autoTable(doc, {
      startY: yPos,
      head: [["Turma", "Horário", "Sensei", "Alunos"]],
      body: data.classesList.map((c) => [c.name, c.schedule, c.sensei, c.studentCount.toString()]),
      ...smallTbl,
    });
    yPos = (doc as any).lastAutoTable.finalY + 12;
  }

  // ── Optional: Lista de Pagamentos ──
  if (data.paymentsList && data.paymentsList.length > 0) {
    yPos = checkPageBreak(doc, yPos);
    drawSectionTitle(doc, "Lista de Pagamentos", yPos, headerBg, accentBg);
    yPos += 9;

    autoTable(doc, {
      startY: yPos,
      head: [["Aluno", "Referência", "Valor", "Status", "Vencimento"]],
      body: data.paymentsList.map((p) => [
        p.studentName,
        p.referenceMonth,
        `R$ ${p.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        p.status,
        p.dueDate,
      ]),
      ...smallTbl,
      margin: { left: 15, right: 15 },
    });
  }

  // ── Footer ──
  drawPdfFooters(doc, `${dojoName} — Relatório de Estatísticas`, headerBg);

  const fileName = `relatorio-${dojoName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
  return fileName;
}

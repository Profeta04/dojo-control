import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PdfDojoInfo, resolveDojoColors } from "./pdfTheme";

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

export function generateDojoReport(data: DojoReportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const { headerBg, lightBg } = resolveDojoColors(data.dojoInfo);
  const dojoName = data.dojoInfo.dojoName || "Dojo";

  // ── Header ──
  doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(dojoName, pageWidth / 2, 18, { align: "center" });

  doc.setFontSize(12);
  doc.text("Relatório de Estatísticas", pageWidth / 2, 27, { align: "center" });

  doc.setFontSize(9);
  doc.text(`Gerado em: ${today}`, pageWidth / 2, 35, { align: "center" });

  let yPos = 50;

  // ── Resumo Geral ──
  doc.setFontSize(13);
  doc.setTextColor(headerBg[0], headerBg[1], headerBg[2]);
  doc.text("Resumo Geral", 20, yPos);
  yPos += 7;

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
    theme: "striped",
    headStyles: { fillColor: headerBg, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: lightBg },
    styles: { fontSize: 10, cellPadding: 4 },
    margin: { left: 20, right: 20 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 12;

  // ── Presenças ──
  doc.setFontSize(13);
  doc.setTextColor(headerBg[0], headerBg[1], headerBg[2]);
  doc.text("Presenças do Mês Atual", 20, yPos);
  yPos += 7;

  autoTable(doc, {
    startY: yPos,
    head: [["Indicador", "Valor"]],
    body: [
      ["Taxa de Presença", `${data.attendanceRate}%`],
      ["Total de Presenças", data.presentCount.toString()],
      ["Total de Ausências", (data.totalAttendance - data.presentCount).toString()],
      ["Total de Registros", data.totalAttendance.toString()],
    ],
    theme: "striped",
    headStyles: { fillColor: headerBg, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: lightBg },
    styles: { fontSize: 10, cellPadding: 4 },
    margin: { left: 20, right: 20 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 12;

  // ── Evolução Presenças ──
  doc.setFontSize(13);
  doc.setTextColor(headerBg[0], headerBg[1], headerBg[2]);
  doc.text("Evolução de Presenças (Últimos 6 Meses)", 20, yPos);
  yPos += 7;

  autoTable(doc, {
    startY: yPos,
    head: [["Mês", "Presenças", "Total", "Taxa"]],
    body: data.monthlyAttendance.map((month) => [
      month.name.charAt(0).toUpperCase() + month.name.slice(1),
      month.presencas.toString(),
      month.total.toString(),
      `${month.taxa}%`,
    ]),
    theme: "striped",
    headStyles: { fillColor: headerBg, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: lightBg },
    styles: { fontSize: 10, cellPadding: 4 },
    margin: { left: 20, right: 20 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 12;

  if (yPos > 240) { doc.addPage(); yPos = 20; }

  // ── Situação Financeira ──
  doc.setFontSize(13);
  doc.setTextColor(headerBg[0], headerBg[1], headerBg[2]);
  doc.text("Situação Financeira", 20, yPos);
  yPos += 7;

  autoTable(doc, {
    startY: yPos,
    head: [["Indicador", "Valor"]],
    body: [
      ["Total Recebido", `R$ ${data.totalReceived.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`],
      ["Pagamentos Pendentes", data.pendingPayments.toString()],
      ["Pagamentos Atrasados", data.overduePayments.toString()],
    ],
    theme: "striped",
    headStyles: { fillColor: headerBg, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: lightBg },
    styles: { fontSize: 10, cellPadding: 4 },
    margin: { left: 20, right: 20 },
  });

  yPos = (doc as any).lastAutoTable.finalY + 12;

  // ── Optional: Lista de Alunos ──
  if (data.studentsList && data.studentsList.length > 0) {
    if (yPos > 200) { doc.addPage(); yPos = 20; }
    doc.setFontSize(13);
    doc.setTextColor(headerBg[0], headerBg[1], headerBg[2]);
    doc.text("Lista de Alunos", 20, yPos);
    yPos += 7;

    autoTable(doc, {
      startY: yPos,
      head: [["Nome", "Email", "Faixa", "Status"]],
      body: data.studentsList.map((s) => [s.name, s.email, s.belt, s.status]),
      theme: "striped",
      headStyles: { fillColor: headerBg, textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: lightBg },
      styles: { fontSize: 9, cellPadding: 3 },
      margin: { left: 20, right: 20 },
    });
    yPos = (doc as any).lastAutoTable.finalY + 12;
  }

  // ── Optional: Lista de Turmas ──
  if (data.classesList && data.classesList.length > 0) {
    if (yPos > 200) { doc.addPage(); yPos = 20; }
    doc.setFontSize(13);
    doc.setTextColor(headerBg[0], headerBg[1], headerBg[2]);
    doc.text("Lista de Turmas", 20, yPos);
    yPos += 7;

    autoTable(doc, {
      startY: yPos,
      head: [["Turma", "Horário", "Sensei", "Alunos"]],
      body: data.classesList.map((c) => [c.name, c.schedule, c.sensei, c.studentCount.toString()]),
      theme: "striped",
      headStyles: { fillColor: headerBg, textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: lightBg },
      styles: { fontSize: 9, cellPadding: 3 },
      margin: { left: 20, right: 20 },
    });
    yPos = (doc as any).lastAutoTable.finalY + 12;
  }

  // ── Optional: Lista de Pagamentos ──
  if (data.paymentsList && data.paymentsList.length > 0) {
    if (yPos > 200) { doc.addPage(); yPos = 20; }
    doc.setFontSize(13);
    doc.setTextColor(headerBg[0], headerBg[1], headerBg[2]);
    doc.text("Lista de Pagamentos", 20, yPos);
    yPos += 7;

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
      theme: "striped",
      headStyles: { fillColor: headerBg, textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: lightBg },
      styles: { fontSize: 9, cellPadding: 3 },
      margin: { left: 15, right: 15 },
    });
  }

  // ── Footer ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    // Colored footer bar
    doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
    doc.rect(0, pageH - 14, pageWidth, 14, "F");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `${dojoName} — Relatório de Estatísticas — Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageH - 5,
      { align: "center" }
    );
  }

  const fileName = `relatorio-${dojoName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
  return fileName;
}

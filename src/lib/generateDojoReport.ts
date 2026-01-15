import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface DojoReportData {
  // General stats
  totalStudents: number;
  activeClasses: number;
  pendingApprovals: number;
  totalSenseis: number;
  
  // Attendance stats
  attendanceRate: number;
  presentCount: number;
  totalAttendance: number;
  monthlyAttendance: Array<{
    name: string;
    presencas: number;
    total: number;
    taxa: number;
  }>;
  
  // Payment stats
  totalReceived: number;
  pendingPayments: number;
  overduePayments: number;
  
  // Graduation stats
  recentGraduations: number;
  
  // Detailed lists
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
  
  // Header
  doc.setFontSize(24);
  doc.setTextColor(20, 20, 20);
  doc.text("🥋 Dojo Manager", pageWidth / 2, 25, { align: "center" });
  
  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.text("Relatório de Estatísticas", pageWidth / 2, 35, { align: "center" });
  
  doc.setFontSize(10);
  doc.text(`Gerado em: ${today}`, pageWidth / 2, 42, { align: "center" });
  
  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 48, pageWidth - 20, 48);
  
  let yPos = 58;
  
  // Section: Resumo Geral
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text("Resumo Geral", 20, yPos);
  yPos += 8;
  
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
    headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
    styles: { fontSize: 10 },
    margin: { left: 20, right: 20 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Section: Presenças
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text("Presenças do Mês Atual", 20, yPos);
  yPos += 8;
  
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
    headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
    styles: { fontSize: 10 },
    margin: { left: 20, right: 20 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Section: Evolução de Presenças (últimos 6 meses)
  doc.setFontSize(14);
  doc.text("Evolução de Presenças (Últimos 6 Meses)", 20, yPos);
  yPos += 8;
  
  autoTable(doc, {
    startY: yPos,
    head: [["Mês", "Presenças", "Total", "Taxa"]],
    body: data.monthlyAttendance.map(month => [
      month.name.charAt(0).toUpperCase() + month.name.slice(1),
      month.presencas.toString(),
      month.total.toString(),
      `${month.taxa}%`
    ]),
    theme: "striped",
    headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
    styles: { fontSize: 10 },
    margin: { left: 20, right: 20 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Check if we need a new page
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }
  
  // Section: Situação Financeira
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text("Situação Financeira", 20, yPos);
  yPos += 8;
  
  autoTable(doc, {
    startY: yPos,
    head: [["Indicador", "Valor"]],
    body: [
      ["Total Recebido", `R$ ${data.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
      ["Pagamentos Pendentes", data.pendingPayments.toString()],
      ["Pagamentos Atrasados", data.overduePayments.toString()],
    ],
    theme: "striped",
    headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
    styles: { fontSize: 10 },
    margin: { left: 20, right: 20 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Optional: Students List
  if (data.studentsList && data.studentsList.length > 0) {
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.text("Lista de Alunos", 20, yPos);
    yPos += 8;
    
    autoTable(doc, {
      startY: yPos,
      head: [["Nome", "Email", "Faixa", "Status"]],
      body: data.studentsList.map(student => [
        student.name,
        student.email,
        student.belt,
        student.status
      ]),
      theme: "striped",
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Optional: Classes List
  if (data.classesList && data.classesList.length > 0) {
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.text("Lista de Turmas", 20, yPos);
    yPos += 8;
    
    autoTable(doc, {
      startY: yPos,
      head: [["Turma", "Horário", "Sensei", "Alunos"]],
      body: data.classesList.map(cls => [
        cls.name,
        cls.schedule,
        cls.sensei,
        cls.studentCount.toString()
      ]),
      theme: "striped",
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Optional: Payments List
  if (data.paymentsList && data.paymentsList.length > 0) {
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.text("Lista de Pagamentos", 20, yPos);
    yPos += 8;
    
    autoTable(doc, {
      startY: yPos,
      head: [["Aluno", "Referência", "Valor", "Status", "Vencimento"]],
      body: data.paymentsList.map(payment => [
        payment.studentName,
        payment.referenceMonth,
        `R$ ${payment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        payment.status,
        payment.dueDate
      ]),
      theme: "striped",
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 },
    });
  }
  
  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Dojo Manager - Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }
  
  // Save the PDF
  const fileName = `relatorio-dojo-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
  
  return fileName;
}

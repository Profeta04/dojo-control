import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const BELT_LABELS: Record<string, string> = {
  branca: "Branca",
  cinza: "Cinza",
  azul: "Azul",
  amarela: "Amarela",
  laranja: "Laranja",
  verde: "Verde",
  roxa: "Roxa",
  marrom: "Marrom",
  preta_1dan: "Preta 1º Dan",
  preta_2dan: "Preta 2º Dan",
  preta_3dan: "Preta 3º Dan",
  preta_4dan: "Preta 4º Dan",
  preta_5dan: "Preta 5º Dan",
  preta_6dan: "Preta 6º Dan",
  preta_7dan: "Preta 7º Dan",
  preta_8dan: "Preta 8º Dan",
  preta_9dan: "Preta 9º Dan",
  preta_10dan: "Preta 10º Dan",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pago: "Pago",
  pendente: "Pendente",
  atrasado: "Atrasado",
};

const TASK_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em Andamento",
  completed: "Concluída",
};

export interface StudentReportData {
  student: {
    name: string;
    email: string;
    phone: string | null;
    belt_grade: string | null;
    birth_date: string | null;
    created_at: string;
  };
  
  graduations: Array<{
    previous_belt: string | null;
    new_belt: string;
    graduation_date: string;
    notes: string | null;
  }>;
  
  attendance: Array<{
    date: string;
    class_name: string;
    present: boolean;
    notes: string | null;
  }>;
  
  payments: Array<{
    reference_month: string;
    amount: number;
    status: string;
    due_date: string;
    paid_date: string | null;
  }>;
  
  tasks: Array<{
    title: string;
    description: string | null;
    status: string;
    priority: string;
    due_date: string | null;
    completed_at: string | null;
  }>;
}

export function generateStudentReport(data: StudentReportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  
  // Header
  doc.setFontSize(24);
  doc.setTextColor(20, 20, 20);
  doc.text("🥋 Dojo Manager", pageWidth / 2, 25, { align: "center" });
  
  doc.setFontSize(14);
  doc.setTextColor(100, 100, 100);
  doc.text("Relatório Individual do Aluno", pageWidth / 2, 35, { align: "center" });
  
  doc.setFontSize(10);
  doc.text(`Gerado em: ${today}`, pageWidth / 2, 42, { align: "center" });
  
  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 48, pageWidth - 20, 48);
  
  let yPos = 58;
  
  // Section: Dados do Aluno
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text("Dados do Aluno", 20, yPos);
  yPos += 8;
  
  const birthDateFormatted = data.student.birth_date 
    ? format(new Date(data.student.birth_date), "dd/MM/yyyy", { locale: ptBR })
    : "Não informado";
    
  const memberSince = format(new Date(data.student.created_at), "dd/MM/yyyy", { locale: ptBR });
  
  autoTable(doc, {
    startY: yPos,
    head: [["Campo", "Valor"]],
    body: [
      ["Nome", data.student.name],
      ["Email", data.student.email],
      ["Telefone", data.student.phone || "Não informado"],
      ["Data de Nascimento", birthDateFormatted],
      ["Faixa Atual", BELT_LABELS[data.student.belt_grade || "branca"] || "Branca"],
      ["Membro Desde", memberSince],
    ],
    theme: "striped",
    headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
    styles: { fontSize: 10 },
    margin: { left: 20, right: 20 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Section: Histórico de Graduações
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text("Histórico de Graduações", 20, yPos);
  yPos += 8;
  
  if (data.graduations.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [["Data", "Faixa Anterior", "Nova Faixa", "Observações"]],
      body: data.graduations.map(g => [
        format(new Date(g.graduation_date), "dd/MM/yyyy", { locale: ptBR }),
        g.previous_belt ? BELT_LABELS[g.previous_belt] || g.previous_belt : "-",
        BELT_LABELS[g.new_belt] || g.new_belt,
        g.notes || "-"
      ]),
      theme: "striped",
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 },
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;
  } else {
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text("Nenhuma graduação registrada.", 20, yPos);
    yPos += 15;
  }
  
  // Check if we need a new page
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }
  
  // Section: Histórico de Presenças
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text("Histórico de Presenças", 20, yPos);
  yPos += 8;
  
  if (data.attendance.length > 0) {
    const presentCount = data.attendance.filter(a => a.present).length;
    const attendanceRate = Math.round((presentCount / data.attendance.length) * 100);
    
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Taxa de presença: ${attendanceRate}% (${presentCount}/${data.attendance.length} aulas)`, 20, yPos);
    yPos += 6;
    
    autoTable(doc, {
      startY: yPos,
      head: [["Data", "Turma", "Presença", "Observações"]],
      body: data.attendance.slice(0, 50).map(a => [
        format(new Date(a.date), "dd/MM/yyyy", { locale: ptBR }),
        a.class_name,
        a.present ? "✓ Presente" : "✗ Ausente",
        a.notes || "-"
      ]),
      theme: "striped",
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 },
    });
    
    if (data.attendance.length > 50) {
      yPos = (doc as any).lastAutoTable.finalY + 3;
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`... e mais ${data.attendance.length - 50} registros.`, 20, yPos);
    }
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
  } else {
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text("Nenhum registro de presença encontrado.", 20, yPos);
    yPos += 15;
  }
  
  // Check if we need a new page
  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }
  
  // Section: Histórico de Pagamentos
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text("Histórico de Pagamentos", 20, yPos);
  yPos += 8;
  
  if (data.payments.length > 0) {
    const totalPaid = data.payments
      .filter(p => p.status === "pago")
      .reduce((sum, p) => sum + p.amount, 0);
    
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Total pago: R$ ${totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, yPos);
    yPos += 6;
    
    autoTable(doc, {
      startY: yPos,
      head: [["Referência", "Valor", "Vencimento", "Status", "Data Pagto"]],
      body: data.payments.map(p => [
        p.reference_month,
        `R$ ${p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        format(new Date(p.due_date), "dd/MM/yyyy", { locale: ptBR }),
        PAYMENT_STATUS_LABELS[p.status] || p.status,
        p.paid_date ? format(new Date(p.paid_date), "dd/MM/yyyy", { locale: ptBR }) : "-"
      ]),
      theme: "striped",
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 },
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;
  } else {
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text("Nenhum pagamento registrado.", 20, yPos);
    yPos += 15;
  }
  
  // Check if we need a new page
  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }
  
  // Section: Tarefas
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text("Tarefas Atribuídas", 20, yPos);
  yPos += 8;
  
  if (data.tasks.length > 0) {
    const completedTasks = data.tasks.filter(t => t.status === "completed").length;
    
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Tarefas concluídas: ${completedTasks}/${data.tasks.length}`, 20, yPos);
    yPos += 6;
    
    autoTable(doc, {
      startY: yPos,
      head: [["Título", "Prioridade", "Status", "Prazo", "Conclusão"]],
      body: data.tasks.map(t => [
        t.title,
        t.priority === "high" ? "Alta" : t.priority === "medium" ? "Média" : "Baixa",
        TASK_STATUS_LABELS[t.status] || t.status,
        t.due_date ? format(new Date(t.due_date), "dd/MM/yyyy", { locale: ptBR }) : "-",
        t.completed_at ? format(new Date(t.completed_at), "dd/MM/yyyy", { locale: ptBR }) : "-"
      ]),
      theme: "striped",
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 },
    });
  } else {
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text("Nenhuma tarefa atribuída.", 20, yPos);
  }
  
  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Dojo Manager - Relatório de ${data.student.name} - Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }
  
  // Save the PDF
  const safeFileName = data.student.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  const fileName = `relatorio-aluno-${safeFileName}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
  
  return fileName;
}

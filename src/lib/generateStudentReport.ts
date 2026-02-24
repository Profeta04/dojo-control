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

const BELT_LABELS: Record<string, string> = {
  branca: "Branca", cinza: "Cinza", azul: "Azul", amarela: "Amarela",
  laranja: "Laranja", verde: "Verde", roxa: "Roxa", marrom: "Marrom",
  preta_1dan: "Preta 1º Dan", preta_2dan: "Preta 2º Dan", preta_3dan: "Preta 3º Dan",
  preta_4dan: "Preta 4º Dan", preta_5dan: "Preta 5º Dan", preta_6dan: "Preta 6º Dan",
  preta_7dan: "Preta 7º Dan", preta_8dan: "Preta 8º Dan", preta_9dan: "Preta 9º Dan",
  preta_10dan: "Preta 10º Dan",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pago: "Pago", pendente: "Pendente", atrasado: "Atrasado",
};

const RARITY_LABELS: Record<string, string> = {
  common: "Comum", rare: "Rara", epic: "Épica", legendary: "Lendária",
};

export interface StudentReportData {
  dojoInfo: PdfDojoInfo;
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
  gamification: {
    totalXp: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
    achievements: Array<{ name: string; rarity: string; unlockedAt: string }>;
  };
}

export function generateStudentReport(data: StudentReportData, logoBase64?: string | null) {
  const doc = new jsPDF();
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const { headerBg, accentBg, lightBg } = resolveDojoColors(data.dojoInfo);
  const dojoName = data.dojoInfo.dojoName || "Dojo";
  const tbl = tableStyles(headerBg, lightBg);
  const smallTbl = smallTableStyles(headerBg, lightBg);

  // ── Header ──
  let yPos = drawPdfHeader(doc, {
    dojoName,
    subtitle: "Relatório Individual do Aluno",
    extraLine: data.student.name,
    dateLine: `Gerado em: ${today}`,
    headerBg,
    accentBg,
    logoBase64,
  });

  // ── Metric Cards ──
  const gam = data.gamification;
  const presentCount = data.attendance.filter((a) => a.present).length;
  const attendanceRate = data.attendance.length > 0
    ? Math.round((presentCount / data.attendance.length) * 100)
    : 0;

  yPos = drawMetricCards(doc, [
    { label: "XP Total", value: `${gam.totalXp} pts` },
    { label: "Nível", value: `${gam.level}` },
    { label: "Presença", value: `${attendanceRate}%` },
    { label: "Conquistas", value: `${gam.achievements.length}` },
  ], yPos, headerBg);

  // ── Dados do Aluno ──
  drawSectionTitle(doc, "Dados do Aluno", yPos, headerBg, accentBg);
  yPos += 9;

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
    ...tbl,
  });
  yPos = (doc as any).lastAutoTable.finalY + 12;

  // ── Graduações ──
  drawSectionTitle(doc, "Histórico de Graduações", yPos, headerBg, accentBg);
  yPos += 9;
  if (data.graduations.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [["Data", "Faixa Anterior", "Nova Faixa", "Observações"]],
      body: data.graduations.map((g) => [
        format(new Date(g.graduation_date), "dd/MM/yyyy", { locale: ptBR }),
        g.previous_belt ? BELT_LABELS[g.previous_belt] || g.previous_belt : "-",
        BELT_LABELS[g.new_belt] || g.new_belt,
        g.notes || "-",
      ]),
      ...smallTbl,
    });
    yPos = (doc as any).lastAutoTable.finalY + 12;
  } else {
    doc.setFontSize(10); doc.setTextColor(120, 120, 120);
    doc.text("Nenhuma graduação registrada.", 20, yPos); yPos += 12;
  }

  yPos = checkPageBreak(doc, yPos, 220);

  // ── Presenças ──
  drawSectionTitle(doc, "Histórico de Presenças", yPos, headerBg, accentBg);
  yPos += 9;
  if (data.attendance.length > 0) {
    doc.setFontSize(10); doc.setTextColor(80, 80, 80);
    doc.text(`Taxa de presença: ${attendanceRate}% (${presentCount}/${data.attendance.length} aulas)`, 20, yPos);
    yPos += 6;

    autoTable(doc, {
      startY: yPos,
      head: [["Data", "Turma", "Presença", "Observações"]],
      body: data.attendance.slice(0, 50).map((a) => [
        format(new Date(a.date), "dd/MM/yyyy", { locale: ptBR }),
        a.class_name,
        a.present ? "✓ Presente" : "✗ Ausente",
        a.notes || "-",
      ]),
      ...smallTbl,
      didParseCell: (hookData: any) => {
        if (hookData.section === "body" && hookData.column.index === 2) {
          const present = data.attendance[hookData.row.index]?.present;
          hookData.cell.styles.textColor = present ? STATUS_COLORS.pago : STATUS_COLORS.atrasado;
          hookData.cell.styles.fontStyle = "bold";
        }
      },
    });

    if (data.attendance.length > 50) {
      yPos = (doc as any).lastAutoTable.finalY + 3;
      doc.setFontSize(8); doc.setTextColor(120, 120, 120);
      doc.text(`... e mais ${data.attendance.length - 50} registros.`, 20, yPos);
    }
    yPos = (doc as any).lastAutoTable.finalY + 12;
  } else {
    doc.setFontSize(10); doc.setTextColor(120, 120, 120);
    doc.text("Nenhum registro de presença encontrado.", 20, yPos); yPos += 12;
  }

  yPos = checkPageBreak(doc, yPos);

  // ── Pagamentos ──
  drawSectionTitle(doc, "Histórico de Pagamentos", yPos, headerBg, accentBg);
  yPos += 9;
  if (data.payments.length > 0) {
    const totalPaid = data.payments.filter((p) => p.status === "pago").reduce((s, p) => s + p.amount, 0);
    doc.setFontSize(10); doc.setTextColor(80, 80, 80);
    doc.text(`Total pago: R$ ${totalPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 20, yPos);
    yPos += 6;

    autoTable(doc, {
      startY: yPos,
      head: [["Referência", "Valor", "Vencimento", "Status", "Data Pagto"]],
      body: data.payments.map((p) => [
        p.reference_month,
        `R$ ${p.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        format(new Date(p.due_date), "dd/MM/yyyy", { locale: ptBR }),
        PAYMENT_STATUS_LABELS[p.status] || p.status,
        p.paid_date ? format(new Date(p.paid_date), "dd/MM/yyyy", { locale: ptBR }) : "-",
      ]),
      ...smallTbl,
      didParseCell: (hookData: any) => {
        if (hookData.section === "body" && hookData.column.index === 3) {
          const status = data.payments[hookData.row.index]?.status;
          if (status && STATUS_COLORS[status]) {
            hookData.cell.styles.textColor = STATUS_COLORS[status];
            hookData.cell.styles.fontStyle = "bold";
          }
        }
      },
    });
    yPos = (doc as any).lastAutoTable.finalY + 12;
  } else {
    doc.setFontSize(10); doc.setTextColor(120, 120, 120);
    doc.text("Nenhum pagamento registrado.", 20, yPos); yPos += 12;
  }

  yPos = checkPageBreak(doc, yPos);

  // ── Pontos & Conquistas ──
  drawSectionTitle(doc, "Pontos & Conquistas", yPos, headerBg, accentBg);
  yPos += 9;

  autoTable(doc, {
    startY: yPos,
    head: [["Métrica", "Valor"]],
    body: [
      ["Pontos Totais", `${gam.totalXp} pts`],
      ["Nível", `${gam.level}`],
      ["Streak Atual", `${gam.currentStreak} dias`],
      ["Maior Streak", `${gam.longestStreak} dias`],
      ["Conquistas Desbloqueadas", `${gam.achievements.length}`],
    ],
    ...tbl,
  });
  yPos = (doc as any).lastAutoTable.finalY + 8;

  if (gam.achievements.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [["Conquista", "Raridade", "Data"]],
      body: gam.achievements.map((a) => [
        a.name,
        RARITY_LABELS[a.rarity] || a.rarity,
        format(new Date(a.unlockedAt), "dd/MM/yyyy", { locale: ptBR }),
      ]),
      ...smallTbl,
    });
  }

  // ── Footer ──
  drawPdfFooters(doc, `${dojoName} — Relatório de ${data.student.name}`, headerBg);

  const safeFileName = data.student.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  const fileName = `relatorio-aluno-${safeFileName}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(fileName);
  return fileName;
}

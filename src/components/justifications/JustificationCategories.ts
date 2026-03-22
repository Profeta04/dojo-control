export const JUSTIFICATION_CATEGORIES = [
  { value: "doenca", label: "🤒 Doença", description: "Problema de saúde" },
  { value: "viagem", label: "✈️ Viagem", description: "Viagem ou deslocamento" },
  { value: "escolar", label: "📚 Compromisso escolar", description: "Prova, trabalho ou evento escolar" },
  { value: "familiar", label: "👨‍👩‍👧 Motivo familiar", description: "Compromisso ou emergência familiar" },
  { value: "trabalho", label: "💼 Trabalho", description: "Compromisso profissional" },
  { value: "lesao", label: "🩹 Lesão", description: "Lesão física que impede treino" },
  { value: "outro", label: "📝 Outro", description: "Outro motivo" },
] as const;

export type JustificationCategory = typeof JUSTIFICATION_CATEGORIES[number]["value"];

export const JUSTIFICATION_STATUS = {
  pendente: { label: "Pendente", color: "bg-warning/10 text-warning border-warning/20" },
  aprovada: { label: "Aprovada", color: "bg-success/10 text-success border-success/20" },
  rejeitada: { label: "Rejeitada", color: "bg-destructive/10 text-destructive border-destructive/20" },
} as const;

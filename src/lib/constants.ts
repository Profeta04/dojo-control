import { Database } from "@/integrations/supabase/types";

export type BeltGrade = Database["public"]["Enums"]["belt_grade"];
export type AppRole = Database["public"]["Enums"]["app_role"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];
export type RegistrationStatus = Database["public"]["Enums"]["registration_status"];

export const BELT_LABELS: Record<BeltGrade, string> = {
  branca: "Faixa Branca",
  branca_ponta_bordo: "Faixa Branca Ponta Bordô",
  bordo: "Faixa Bordô",
  bordo_ponta_cinza: "Faixa Bordô Ponta Cinza",
  cinza: "Faixa Cinza",
  cinza_branca: "Faixa Cinza e Branca",
  cinza_preta: "Faixa Cinza e Preta",
  cinza_ponta_azul_escura: "Faixa Cinza Ponta Azul Escura",
  azul_escura: "Faixa Azul Escura",
  azul_escura_ponta_azul: "Faixa Azul Escura Ponta Azul",
  azul: "Faixa Azul",
  azul_ponta_amarela: "Faixa Azul Ponta Amarela",
  amarela: "Faixa Amarela",
  amarela_branca: "Faixa Amarela e Branca",
  amarela_preta: "Faixa Amarela e Preta",
  amarela_ponta_laranja: "Faixa Amarela Ponta Laranja",
  laranja: "Faixa Laranja",
  laranja_branca: "Faixa Laranja e Branca",
  laranja_preta: "Faixa Laranja e Preta",
  verde: "Faixa Verde",
  verde_branca: "Faixa Verde e Branca",
  verde_preta: "Faixa Verde e Preta",
  roxa: "Faixa Roxa",
  marrom: "Faixa Marrom",
  preta_1dan: "Faixa Preta 1º Dan",
  preta_2dan: "Faixa Preta 2º Dan",
  preta_3dan: "Faixa Preta 3º Dan",
  preta_4dan: "Faixa Preta 4º Dan",
  preta_5dan: "Faixa Preta 5º Dan",
  preta_6dan: "Faixa Preta 6º Dan",
  preta_7dan: "Faixa Preta 7º Dan",
  preta_8dan: "Faixa Preta 8º Dan",
  preta_9dan: "Faixa Preta 9º Dan",
  preta_10dan: "Faixa Preta 10º Dan",
  coral: "Faixa Coral",
  vermelha: "Faixa Vermelha",
};

// BJJ belts that support degrees (graus) - all BJJ belts have 4 degrees
export const BJJ_DEGREE_BELTS = [
  "branca",
  "cinza_branca", "cinza", "cinza_preta",
  "amarela_branca", "amarela", "amarela_preta",
  "laranja_branca", "laranja", "laranja_preta",
  "verde_branca", "verde", "verde_preta",
  "azul", "roxa", "marrom",
  "preta_1dan", "preta_2dan", "preta_3dan", "preta_4dan", "preta_5dan", "preta_6dan",
];

// BJJ belt order for progression
export const BJJ_BELT_ORDER: BeltGrade[] = [
  "branca",
  "cinza_branca", "cinza", "cinza_preta",
  "amarela_branca", "amarela", "amarela_preta",
  "laranja_branca", "laranja", "laranja_preta",
  "verde_branca", "verde", "verde_preta",
  "azul", "roxa", "marrom",
  "preta_1dan", "preta_2dan", "preta_3dan", "preta_4dan", "preta_5dan", "preta_6dan",
  "coral", "vermelha",
];

// Judo belt order for progression
export const JUDO_BELT_ORDER: BeltGrade[] = [
  "branca", "branca_ponta_bordo", "bordo", "bordo_ponta_cinza", "cinza", "cinza_ponta_azul_escura",
  "azul_escura", "azul_escura_ponta_azul", "azul", "azul_ponta_amarela", "amarela", "amarela_ponta_laranja",
  "laranja", "verde", "roxa", "marrom",
  "preta_1dan", "preta_2dan", "preta_3dan", "preta_4dan", "preta_5dan",
  "preta_6dan", "preta_7dan", "preta_8dan", "preta_9dan", "preta_10dan",
];

export function getBjjBeltLabel(grade: string, degree: number): string {
  const baseLabel = BELT_LABELS[grade as BeltGrade] || grade;
  if (degree > 0 && degree <= 4) {
    return `${baseLabel} - ${degree}º Grau`;
  }
  return baseLabel;
}

export const BELT_COLORS: Record<BeltGrade, string> = {
  branca: "bg-white border-2 border-foreground/40",
  branca_ponta_bordo: "bg-white border-2 border-foreground/40",
  bordo: "bg-red-900",
  bordo_ponta_cinza: "bg-red-900",
  cinza: "bg-belt-cinza",
  cinza_branca: "bg-belt-cinza",
  cinza_preta: "bg-belt-cinza",
  cinza_ponta_azul_escura: "bg-belt-cinza",
  azul_escura: "bg-blue-900",
  azul_escura_ponta_azul: "bg-blue-900",
  azul: "bg-belt-azul",
  azul_ponta_amarela: "bg-belt-azul",
  amarela: "bg-belt-amarela",
  amarela_branca: "bg-belt-amarela",
  amarela_preta: "bg-belt-amarela",
  amarela_ponta_laranja: "bg-belt-amarela",
  laranja: "bg-belt-laranja",
  laranja_branca: "bg-belt-laranja",
  laranja_preta: "bg-belt-laranja",
  verde: "bg-belt-verde",
  verde_branca: "bg-belt-verde",
  verde_preta: "bg-belt-verde",
  roxa: "bg-belt-roxa",
  marrom: "bg-belt-marrom",
  preta_1dan: "bg-belt-preta",
  preta_2dan: "bg-belt-preta",
  preta_3dan: "bg-belt-preta",
  preta_4dan: "bg-belt-preta",
  preta_5dan: "bg-belt-preta",
  preta_6dan: "bg-belt-preta",
  preta_7dan: "bg-belt-preta",
  preta_8dan: "bg-belt-preta",
  preta_9dan: "bg-belt-preta",
  preta_10dan: "bg-belt-preta",
  coral: "bg-red-700",
  vermelha: "bg-red-600",
};

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Administrador",
  dono: "Sensei", // Legacy: migrated to sensei
  admin: "Administrador",
  sensei: "Sensei",
  student: "Aluno",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pendente: "Pendente",
  pago: "Pago",
  atrasado: "Atrasado",
};

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

export type ReceiptStatus = "pendente_verificacao" | "aprovado" | "rejeitado";

export const RECEIPT_STATUS_LABELS: Record<ReceiptStatus, string> = {
  pendente_verificacao: "Em Verificação",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

export type PaymentCategory = "mensalidade" | "material" | "taxa_exame" | "evento" | "matricula" | "outro";

export const PAYMENT_CATEGORY_LABELS: Record<PaymentCategory, string> = {
  mensalidade: "Mensalidade",
  material: "Material / Kimono",
  taxa_exame: "Taxa de Exame",
  evento: "Evento",
  matricula: "Matrícula",
  outro: "Outro",
};

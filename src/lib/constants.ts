import { Database } from "@/integrations/supabase/types";

export type BeltGrade = Database["public"]["Enums"]["belt_grade"];
export type AppRole = Database["public"]["Enums"]["app_role"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];
export type RegistrationStatus = Database["public"]["Enums"]["registration_status"];

export const BELT_LABELS: Record<BeltGrade, string> = {
  branca: "Faixa Branca",
  cinza: "Faixa Cinza",
  azul: "Faixa Azul",
  amarela: "Faixa Amarela",
  laranja: "Faixa Laranja",
  verde: "Faixa Verde",
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
};

export const BELT_COLORS: Record<BeltGrade, string> = {
  branca: "bg-white border-2 border-foreground/20",
  cinza: "bg-belt-cinza",
  azul: "bg-belt-azul",
  amarela: "bg-belt-amarela",
  laranja: "bg-belt-laranja",
  verde: "bg-belt-verde",
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
};

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  dono: "Dono",
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

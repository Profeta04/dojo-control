// Subscription tiers for Dojo Control (PIX-based, no Stripe)

export type FeatureKey =
  | "qr_checkin"
  | "pdf_reports"
  | "multi_dojo";

export const SUBSCRIPTION_TIERS = {
  basico: {
    name: "Básico",
    description: "Ideal para dojos iniciantes",
    price_brl: 39,
    price_per_student: false as const,
    max_students: 15,
    features: [
      "Até 15 alunos",
      "Gestão de turmas",
      "Controle de presenças",
      "Pagamentos e cobranças",
      "Notificações push",
      "Gamificação (XP/Conquistas)",
    ],
    blocked_features: ["qr_checkin", "pdf_reports", "multi_dojo"] as FeatureKey[],
  },
  pro: {
    name: "Pro",
    description: "Para dojos em crescimento",
    price_brl: 99,
    price_per_student: false as const,
    max_students: 30,
    features: [
      "Até 30 alunos",
      "Tudo do Básico",
      "QR Code check-in automático",
    ],
    blocked_features: ["pdf_reports", "multi_dojo"] as FeatureKey[],
  },
  premium: {
    name: "Premium",
    description: "Sem limites para seu dojo",
    price_brl: 7,
    price_per_student: true as const,
    min_students: 20,
    max_students: Infinity,
    features: [
      "Mínimo 20 alunos (R$7/aluno)",
      "Tudo do Pro",
      "Relatórios avançados (PDF)",
      "Multi-dojo",
    ],
    blocked_features: [] as FeatureKey[],
    popular: true,
  },
} as const;

export type SubscriptionTierKey = keyof typeof SUBSCRIPTION_TIERS;

/**
 * Check if a specific feature is available for a given tier.
 * Returns true if the feature is NOT blocked.
 */
export function isFeatureAvailable(tier: SubscriptionTierKey | null, feature: FeatureKey): boolean {
  if (!tier) return false;
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  return !tierConfig.blocked_features.includes(feature);
}

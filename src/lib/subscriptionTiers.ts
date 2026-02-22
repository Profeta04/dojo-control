// Subscription tiers for Dojo Control (PIX-based, no Stripe)

export type FeatureKey =
  | "qr_checkin"
  | "pdf_reports"
  | "multi_dojo";

export const TRIAL_TIER = {
  name: "Teste",
  description: "Experimente todas as funcionalidades por 5 dias",
  price_brl: 0,
  price_per_student: false as const,
  max_students: Infinity,
  duration_days: 5,
  features: [
    "Gratuito por 5 dias",
    "Alunos ilimitados",
    "Todas as funcionalidades Premium",
    "QR Code check-in automático",
    "Relatórios avançados (PDF)",
    "Multi-dojo",
  ],
  blocked_features: [] as FeatureKey[],
} as const;

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
      "Relatórios avançados (PDF)",
    ],
    blocked_features: ["qr_checkin", "multi_dojo"] as FeatureKey[],
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
      "Alunos ilimitados",
      "Tudo do Pro",
      "QR Code check-in automático",
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
export function isFeatureAvailable(tier: SubscriptionTierKey | "teste" | null, feature: FeatureKey): boolean {
  if (!tier) return false;
  if (tier === "teste") return !TRIAL_TIER.blocked_features.includes(feature);
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  return !tierConfig.blocked_features.includes(feature);
}

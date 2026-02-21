// Stripe product/price mapping for Dojo Control subscription tiers

export type FeatureKey =
  | "qr_checkin"
  | "pdf_reports"
  | "multi_dojo";

export const SUBSCRIPTION_TIERS = {
  basico: {
    name: "Básico",
    description: "Ideal para dojos iniciantes",
    price_id: "price_1T3483A48Ser2h87UDzJMzBo",
    product_id: "prod_U16KdvJiiiNbXo",
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
    price_id: "price_1T348VA48Ser2h87HjtZz31g",
    product_id: "prod_U16LFtXYsaNSSI",
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
    price_id: "price_1T34LJA48Ser2h87dHNZkV6R",
    product_id: "prod_U16YrAoCGL1xqW",
    price_brl: 7,
    price_per_student: true as const,
    max_students: Infinity,
    features: [
      "Alunos ilimitados (R$7/aluno)",
      "Tudo do Pro",
      "Relatórios avançados (PDF)",
      "Multi-dojo",
    ],
    blocked_features: [] as FeatureKey[],
    popular: true,
  },
} as const;

export type SubscriptionTierKey = keyof typeof SUBSCRIPTION_TIERS;

export function getTierByProductId(productId: string): SubscriptionTierKey | null {
  for (const [key, tier] of Object.entries(SUBSCRIPTION_TIERS)) {
    if (tier.product_id === productId) return key as SubscriptionTierKey;
  }
  return null;
}

/**
 * Check if a specific feature is available for a given tier.
 * Returns true if the feature is NOT blocked.
 */
export function isFeatureAvailable(tier: SubscriptionTierKey | null, feature: FeatureKey): boolean {
  if (!tier) return false;
  const tierConfig = SUBSCRIPTION_TIERS[tier];
  return !tierConfig.blocked_features.includes(feature);
}

// Stripe product/price mapping for Dojo Control subscription tiers
export const SUBSCRIPTION_TIERS = {
  basico: {
    name: "Básico",
    description: "Ideal para dojos iniciantes",
    price_id: "price_1T3483A48Ser2h87UDzJMzBo",
    product_id: "prod_U16KdvJiiiNbXo",
    price_brl: 39,
    max_students: 15,
    features: [
      "Até 15 alunos",
      "Gestão de turmas",
      "Controle de presenças",
      "Pagamentos e cobranças",
      "Notificações push",
    ],
  },
  pro: {
    name: "Pro",
    description: "Para dojos em crescimento",
    price_id: "price_1T348VA48Ser2h87HjtZz31g",
    product_id: "prod_U16LFtXYsaNSSI",
    price_brl: 99,
    max_students: 30,
    features: [
      "Até 30 alunos",
      "Gestão de turmas",
      "Controle de presenças",
      "Pagamentos e cobranças",
      "Notificações push",
      "Relatórios avançados",
      "Multi-dojo",
    ],
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

import { useSubscription } from "@/hooks/useSubscription";
import { isFeatureAvailable, FeatureKey, SUBSCRIPTION_TIERS } from "@/lib/subscriptionTiers";

/**
 * Hook to check if a feature is available for the current subscription.
 * Returns { allowed, tier, loading, subscribed }
 */
export function useFeatureGate(feature: FeatureKey) {
  const { tier, subscribed, loading } = useSubscription();

  const allowed = subscribed && isFeatureAvailable(tier, feature);

  return { allowed, tier, subscribed, loading };
}

/**
 * Get the minimum tier name required for a feature.
 */
export function getRequiredTierName(feature: FeatureKey): string {
  for (const [, tierConfig] of Object.entries(SUBSCRIPTION_TIERS)) {
    if (!tierConfig.blocked_features.includes(feature)) {
      return tierConfig.name;
    }
  }
  return "Premium";
}

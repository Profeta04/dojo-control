import { ReactNode } from "react";
import { useFeatureGate, getRequiredTierName } from "@/hooks/useFeatureGate";
import { FeatureKey } from "@/lib/subscriptionTiers";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  /** If true, renders nothing instead of upgrade prompt */
  hideIfBlocked?: boolean;
  /** Optional fallback component */
  fallback?: ReactNode;
}

/**
 * Wraps children and only renders them if the current subscription allows the feature.
 * Shows an upgrade prompt otherwise.
 */
export function FeatureGate({ feature, children, hideIfBlocked, fallback }: FeatureGateProps) {
  const { allowed, loading, subscribed } = useFeatureGate(feature);
  const navigate = useNavigate();

  if (loading) return null;

  if (!subscribed || !allowed) {
    if (hideIfBlocked) return null;

    if (fallback) return <>{fallback}</>;

    const requiredTier = getRequiredTierName(feature);

    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8 px-4 text-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30">
        <Lock className="h-8 w-8 text-muted-foreground/50" />
        <div>
          <p className="font-medium text-foreground">
            Recurso exclusivo do plano {requiredTier}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Faça upgrade para desbloquear esta funcionalidade.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/settings?tab=planos")}
        >
          Ver planos
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

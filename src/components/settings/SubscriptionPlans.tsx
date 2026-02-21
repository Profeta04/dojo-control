import { useState } from "react";
import { Check, Crown, Loader2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { SUBSCRIPTION_TIERS, SubscriptionTierKey } from "@/lib/subscriptionTiers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function SubscriptionPlans() {
  const { subscribed, tier: currentTier, subscriptionEnd, loading, refresh } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const handleCheckout = async (tierKey: SubscriptionTierKey) => {
    setCheckoutLoading(tierKey);
    try {
      const tier = SUBSCRIPTION_TIERS[tierKey];
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: tier.price_id },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao iniciar checkout");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao abrir portal de assinatura");
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current subscription status */}
      {subscribed && currentTier && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6">
            <div className="flex items-center gap-3">
              <Crown className="h-6 w-6 text-primary" />
              <div>
                <p className="font-semibold text-foreground">
                  Plano {SUBSCRIPTION_TIERS[currentTier].name} ativo
                </p>
                {subscriptionEnd && (
                  <p className="text-sm text-muted-foreground">
                    Renova em {new Date(subscriptionEnd).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageSubscription}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Gerenciar Assinatura
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pricing cards */}
      <div className="grid gap-6 md:grid-cols-2 max-w-3xl">
        {(Object.entries(SUBSCRIPTION_TIERS) as [SubscriptionTierKey, typeof SUBSCRIPTION_TIERS[SubscriptionTierKey]][]).map(
          ([key, tier]) => {
            const isCurrentPlan = subscribed && currentTier === key;
            const isPopular = "popular" in tier && tier.popular;

            return (
              <Card
                key={key}
                className={cn(
                  "relative flex flex-col",
                  isPopular && "border-primary shadow-lg",
                  isCurrentPlan && "ring-2 ring-primary"
                )}
              >
                {isPopular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                    Mais popular
                  </Badge>
                )}
                {isCurrentPlan && (
                  <Badge className="absolute -top-3 right-4 bg-primary text-primary-foreground">
                    Seu Plano
                  </Badge>
                )}

                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-foreground">
                      R${tier.price_brl}
                    </span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-3 flex-1 mb-6">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrentPlan ? (
                    <Button variant="outline" disabled className="w-full">
                      Plano atual
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={isPopular ? "default" : "outline"}
                      onClick={() => handleCheckout(key)}
                      disabled={!!checkoutLoading}
                    >
                      {checkoutLoading === key ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {subscribed ? "Trocar plano" : "Assinar agora"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          }
        )}
      </div>

      {/* Refresh button */}
      <div className="flex justify-center">
        <Button variant="ghost" size="sm" onClick={refresh} className="text-muted-foreground">
          Atualizar status da assinatura
        </Button>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Check, Crown, Loader2, ExternalLink, Star } from "lucide-react";
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

  const formatPrice = (tier: typeof SUBSCRIPTION_TIERS[SubscriptionTierKey]) => {
    if (tier.price_per_student) {
      return (
        <>
          <span className="text-4xl font-bold text-foreground">R${tier.price_brl}</span>
          <span className="text-muted-foreground">/aluno/mês</span>
        </>
      );
    }
    return (
      <>
        <span className="text-4xl font-bold text-foreground">R${tier.price_brl}</span>
        <span className="text-muted-foreground">/mês</span>
      </>
    );
  };

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
      <div className="grid gap-6 md:grid-cols-3 max-w-5xl">
        {(Object.entries(SUBSCRIPTION_TIERS) as [SubscriptionTierKey, typeof SUBSCRIPTION_TIERS[SubscriptionTierKey]][]).map(
          ([key, tier]) => {
            const isCurrentPlan = subscribed && currentTier === key;
            const isPopular = "popular" in tier && tier.popular;

            return (
              <Card
                key={key}
                className={cn(
                  "relative flex flex-col",
                  isPopular && "border-primary shadow-lg scale-[1.02]",
                  isCurrentPlan && "ring-2 ring-primary"
                )}
              >
                {isPopular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground gap-1">
                    <Star className="h-3 w-3" />
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
                    {formatPrice(tier)}
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

      {/* Feature comparison */}
      <Card className="max-w-5xl">
        <CardHeader>
          <CardTitle className="text-lg">Comparação de funcionalidades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium">Funcionalidade</th>
                  <th className="text-center py-2 px-3 font-medium">Básico</th>
                  <th className="text-center py-2 px-3 font-medium">Pro</th>
                  <th className="text-center py-2 px-3 font-medium">Premium</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {[
                  { name: "Limite de alunos", basico: "15", pro: "30", premium: "Ilimitado" },
                  { name: "Gestão de turmas", basico: true, pro: true, premium: true },
                  { name: "Controle de presenças", basico: true, pro: true, premium: true },
                  { name: "Pagamentos e cobranças", basico: true, pro: true, premium: true },
                  { name: "Notificações push", basico: true, pro: true, premium: true },
                  { name: "Gamificação (XP/Conquistas)", basico: true, pro: true, premium: true },
                  { name: "QR Code check-in", basico: false, pro: true, premium: true },
                  { name: "Relatórios PDF", basico: false, pro: false, premium: true },
                  { name: "Multi-dojo", basico: false, pro: false, premium: true },
                ].map((row) => (
                  <tr key={row.name} className="border-b last:border-0">
                    <td className="py-2 pr-4 text-foreground">{row.name}</td>
                    {(["basico", "pro", "premium"] as const).map((plan) => (
                      <td key={plan} className="text-center py-2 px-3">
                        {typeof row[plan] === "boolean" ? (
                          row[plan] ? (
                            <Check className="h-4 w-4 text-primary mx-auto" />
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )
                        ) : (
                          <span className="font-medium text-foreground">{row[plan]}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Refresh button */}
      <div className="flex justify-center">
        <Button variant="ghost" size="sm" onClick={refresh} className="text-muted-foreground">
          Atualizar status da assinatura
        </Button>
      </div>
    </div>
  );
}

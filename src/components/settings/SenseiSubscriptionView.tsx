import { useState } from "react";
import { Check, Crown, Loader2, Star, Upload, QrCode, Copy, CheckCircle, Tag } from "lucide-react";
import pixQrCode from "@/assets/pix-qrcode.png";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { useDojoContext } from "@/hooks/useDojoContext";
import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { SUBSCRIPTION_TIERS, SubscriptionTierKey } from "@/lib/subscriptionTiers";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

export function SenseiSubscriptionView() {
  const { subscribed, tier: currentTier, subscriptionEnd, status, loading, refresh } = useSubscription();
  const { currentDojoId } = useDojoContext();
  const [selectedTier, setSelectedTier] = useState<SubscriptionTierKey | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ name: string; discount_type: string; discount_value: number } | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: adminPixKey } = useQuery({
    queryKey: ["admin-pix-key"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("value").eq("key", "admin_pix_key").maybeSingle();
      return data?.value || null;
    },
  });

  const { data: studentCount = 1 } = useQuery({
    queryKey: ["dojo-student-count", currentDojoId],
    queryFn: async () => {
      if (!currentDojoId) return 1;
      const { data: studentProfiles } = await supabase
        .from("profiles").select("user_id").eq("dojo_id", currentDojoId).eq("registration_status", "aprovado");
      if (!studentProfiles) return 1;
      const { data: studentRoles } = await supabase
        .from("user_roles").select("user_id").eq("role", "student")
        .in("user_id", studentProfiles.map(p => p.user_id));
      return Math.max(studentRoles?.length ?? 1, 1);
    },
    enabled: !!currentDojoId,
  });

  // Get active global promotions
  const { data: globalPromos = [] } = useQuery({
    queryKey: ["active-global-promos"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("subscription_promotions")
        .select("*")
        .eq("type", "global")
        .eq("is_active", true)
        .lte("valid_from", now)
        .gte("valid_until", now);
      return data || [];
    },
  });

  const getBasePrice = (tierKey: SubscriptionTierKey) => {
    const tier = SUBSCRIPTION_TIERS[tierKey];
    return tier.price_per_student ? tier.price_brl * studentCount : tier.price_brl;
  };

  const getDiscountedPrice = (tierKey: SubscriptionTierKey) => {
    let price = getBasePrice(tierKey);
    // Apply global promo
    const globalPromo = globalPromos.find(p =>
      !p.applicable_tiers || p.applicable_tiers.includes(tierKey)
    );
    if (globalPromo) {
      price = globalPromo.discount_type === "percent"
        ? price * (1 - globalPromo.discount_value / 100)
        : Math.max(0, price - globalPromo.discount_value);
    }
    // Apply coupon
    if (appliedPromo) {
      price = appliedPromo.discount_type === "percent"
        ? price * (1 - appliedPromo.discount_value / 100)
        : Math.max(0, price - appliedPromo.discount_value);
    }
    return Math.round(price * 100) / 100;
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("subscription_promotions")
        .select("*")
        .eq("code", couponCode.trim().toUpperCase())
        .eq("type", "coupon")
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error("Cupom inválido ou expirado");
        return;
      }
      if (data.valid_from && new Date(data.valid_from) > new Date()) {
        toast.error("Este cupom ainda não é válido");
        return;
      }
      if (data.valid_until && new Date(data.valid_until) < new Date()) {
        toast.error("Este cupom expirou");
        return;
      }
      if (data.max_uses && data.current_uses >= data.max_uses) {
        toast.error("Este cupom atingiu o limite de usos");
        return;
      }

      setAppliedPromo({
        name: data.name,
        discount_type: data.discount_type,
        discount_value: Number(data.discount_value),
      });
      toast.success(`Cupom "${data.name}" aplicado!`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao verificar cupom");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleSelectPlan = (tierKey: SubscriptionTierKey) => {
    if (!adminPixKey) {
      toast.error("Chave PIX do administrador não configurada. Entre em contato com o suporte.");
      return;
    }
    setSelectedTier(tierKey);
  };

  const handleCopyPixKey = async () => {
    if (!adminPixKey) return;
    await navigator.clipboard.writeText(adminPixKey);
    setCopied(true);
    toast.success("Chave PIX copiada!");
    setTimeout(() => setCopied(false), 3000);
  };

  const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTier || !currentDojoId) return;
    setUploading(true);
    try {
      const filePath = `${currentDojoId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("subscription-receipts").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("dojo_subscriptions").insert({
        dojo_id: currentDojoId,
        tier: selectedTier,
        status: "pendente",
        receipt_url: filePath,
        receipt_submitted_at: new Date().toISOString(),
      });
      if (insertError) throw insertError;

      // Increment coupon usage if applied
      if (appliedPromo && couponCode) {
        try {
          await supabase
            .from("subscription_promotions")
            .update({ current_uses: (appliedPromo as any).current_uses ? (appliedPromo as any).current_uses + 1 : 1 })
            .eq("code", couponCode.trim().toUpperCase());
        } catch {}
      }

      toast.success("Comprovante enviado! Aguarde a aprovação do administrador.");
      setSelectedTier(null);
      setAppliedPromo(null);
      setCouponCode("");
      refresh();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar comprovante");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const formatPrice = (tier: typeof SUBSCRIPTION_TIERS[SubscriptionTierKey], tierKey: SubscriptionTierKey) => {
    const discounted = getDiscountedPrice(tierKey);
    const base = getBasePrice(tierKey);
    const hasDiscount = discounted < base;

    if (tier.price_per_student) {
      return (
        <>
          <span className="text-4xl font-bold text-foreground">R${tier.price_brl}</span>
          <span className="text-muted-foreground">/aluno/mês</span>
          <p className="text-sm text-muted-foreground mt-1">
            {studentCount} aluno{studentCount !== 1 ? "s" : ""} ={" "}
            {hasDiscount ? (
              <>
                <span className="line-through">R${base}</span>{" "}
                <span className="font-semibold text-primary">R${discounted}/mês</span>
              </>
            ) : (
              <span className="font-semibold text-foreground">R${base}/mês</span>
            )}
          </p>
        </>
      );
    }
    return (
      <>
        {hasDiscount ? (
          <>
            <span className="text-2xl line-through text-muted-foreground">R${base}</span>{" "}
            <span className="text-4xl font-bold text-primary">R${discounted}</span>
          </>
        ) : (
          <span className="text-4xl font-bold text-foreground">R${base}</span>
        )}
        <span className="text-muted-foreground">/mês</span>
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Active global promo banner */}
      {globalPromos.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 pt-6">
            <Tag className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold text-foreground">🎉 Promoção ativa!</p>
              <p className="text-sm text-muted-foreground">
                {globalPromos[0].name} — {globalPromos[0].discount_type === "percent"
                  ? `${globalPromos[0].discount_value}% de desconto`
                  : `R$${globalPromos[0].discount_value} de desconto`}
                {globalPromos[0].valid_until && ` até ${new Date(globalPromos[0].valid_until).toLocaleDateString("pt-BR")}`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
                    Válido até {new Date(subscriptionEnd).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {status === "pendente" && !subscribed && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="flex items-center gap-3 pt-6">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
            <div>
              <p className="font-semibold text-foreground">Comprovante em análise</p>
              <p className="text-sm text-muted-foreground">
                Seu comprovante de pagamento está sendo verificado.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coupon input */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Tag className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder="Código do cupom"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              className="max-w-xs uppercase"
            />
            <Button size="sm" onClick={handleApplyCoupon} disabled={applyingCoupon || !couponCode.trim()}>
              {applyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
            </Button>
            {appliedPromo && (
              <Badge className="bg-primary text-primary-foreground">
                ✓ {appliedPromo.name}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

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
                  <div className="mt-4">{formatPrice(tier, key)}</div>
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
                    <Button variant="outline" disabled className="w-full">Plano atual</Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={isPopular ? "default" : "outline"}
                      onClick={() => handleSelectPlan(key)}
                      disabled={status === "pendente"}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      {subscribed ? "Trocar plano" : "Assinar via PIX"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          }
        )}
      </div>

      {/* Feature comparison table */}
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
                          row[plan] ? <Check className="h-4 w-4 text-primary mx-auto" /> : <span className="text-muted-foreground/40">—</span>
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

      <div className="flex justify-center">
        <Button variant="ghost" size="sm" onClick={refresh} className="text-muted-foreground">
          Atualizar status da assinatura
        </Button>
      </div>

      {/* PIX Payment Dialog */}
      <Dialog open={!!selectedTier} onOpenChange={(open) => !open && setSelectedTier(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Pagamento via PIX
            </DialogTitle>
            <DialogDescription>
              {selectedTier && (
                <>
                  Plano {SUBSCRIPTION_TIERS[selectedTier].name} — <strong>R${getDiscountedPrice(selectedTier)}/mês</strong>
                  {getDiscountedPrice(selectedTier) < getBasePrice(selectedTier) && (
                    <span className="ml-1 line-through text-muted-foreground">R${getBasePrice(selectedTier)}</span>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-center">
              <img src={pixQrCode} alt="QR Code PIX" className="w-48 h-48 rounded-lg border" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Chave PIX:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono break-all">
                  {adminPixKey || "Não configurada"}
                </code>
                <Button variant="outline" size="icon" onClick={handleCopyPixKey} disabled={!adminPixKey}>
                  {copied ? <CheckCircle className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="text-sm font-medium">Como pagar:</p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Copie a chave PIX acima</li>
                <li>Faça um PIX de <strong>R${selectedTier ? getDiscountedPrice(selectedTier) : 0}</strong></li>
                <li>Envie o comprovante abaixo</li>
                <li>Aguarde a aprovação (até 24h)</li>
              </ol>
            </div>
            <div className="space-y-2">
              <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleUploadReceipt} className="hidden" />
              <Button className="w-full" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                {uploading ? "Enviando..." : "Enviar comprovante"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

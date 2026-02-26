import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Settings, Loader2, Plus, Pencil, Trash2, Tag, Crown, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { SUBSCRIPTION_TIERS, SubscriptionTierKey } from "@/lib/subscriptionTiers";

interface Promotion {
  id: string;
  name: string;
  code: string | null;
  type: string;
  discount_type: string;
  discount_value: number;
  valid_from: string | null;
  valid_until: string | null;
  max_uses: number | null;
  current_uses: number;
  applicable_tiers: string[] | null;
  is_active: boolean;
  created_at: string;
}

export function AdminSubscriptionView() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // PIX key state
  const [editingPixKey, setEditingPixKey] = useState(false);
  const [pixKeyInput, setPixKeyInput] = useState("");
  const [savingPixKey, setSavingPixKey] = useState(false);
  const [copied, setCopied] = useState(false);

  // Promo dialog state
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [savingPromo, setSavingPromo] = useState(false);
  const [promoForm, setPromoForm] = useState({
    name: "",
    code: "",
    type: "coupon" as "coupon" | "global",
    discount_type: "percent" as "percent" | "fixed",
    discount_value: "",
    valid_from: "",
    valid_until: "",
    max_uses: "",
    applicable_tiers: [] as string[],
    is_active: true,
  });

  const { data: adminPixKey } = useQuery({
    queryKey: ["admin-pix-key"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("value").eq("key", "admin_pix_key").maybeSingle();
      return data?.value || null;
    },
  });

  const { data: promotions = [], isLoading: loadingPromos } = useQuery({
    queryKey: ["admin-promotions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_promotions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Promotion[];
    },
  });

  // Plan config from settings
  const { data: tierConfig } = useQuery({
    queryKey: ["tier-config"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("value").eq("key", "subscription_tiers_config").maybeSingle();
      return data?.value ? JSON.parse(data.value) : null;
    },
  });

  const [editingPlans, setEditingPlans] = useState(false);
  const [planForm, setPlanForm] = useState<Record<string, { price: string; max_students: string; base_price?: string }>>({});
  const [savingPlans, setSavingPlans] = useState(false);

  const startEditPlans = () => {
    const config = tierConfig || {};
    const form: Record<string, { price: string; max_students: string; base_price?: string }> = {};
    (Object.keys(SUBSCRIPTION_TIERS) as SubscriptionTierKey[]).forEach((key) => {
      const override = config[key] || {};
      const tierDef = SUBSCRIPTION_TIERS[key];
      const hasBasePrice = "base_price_brl" in tierDef;
      form[key] = {
        price: String(override.price_brl ?? tierDef.price_brl),
        max_students: String(override.max_students ?? (tierDef.max_students === Infinity ? "" : tierDef.max_students)),
        ...(hasBasePrice ? { base_price: String(override.base_price_brl ?? (tierDef as any).base_price_brl) } : {}),
      };
    });
    setPlanForm(form);
    setEditingPlans(true);
  };

  const handleSavePlans = async () => {
    setSavingPlans(true);
    try {
      const config: Record<string, any> = {};
      Object.entries(planForm).forEach(([key, val]) => {
        config[key] = {
          price_brl: Number(val.price),
          max_students: val.max_students ? Number(val.max_students) : null,
          ...(val.base_price !== undefined ? { base_price_brl: Number(val.base_price) } : {}),
        };
      });
      const { error } = await supabase
        .from("settings")
        .upsert({ key: "subscription_tiers_config", value: JSON.stringify(config) }, { onConflict: "key" });
      if (error) throw error;
      toast.success("Planos atualizados!");
      setEditingPlans(false);
      queryClient.invalidateQueries({ queryKey: ["tier-config"] });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar planos");
    } finally {
      setSavingPlans(false);
    }
  };

  const handleSavePixKey = async () => {
    setSavingPixKey(true);
    try {
      const { error } = await supabase
        .from("settings")
        .upsert({ key: "admin_pix_key", value: pixKeyInput }, { onConflict: "key" });
      if (error) throw error;
      toast.success("Chave PIX salva!");
      setEditingPixKey(false);
      queryClient.invalidateQueries({ queryKey: ["admin-pix-key"] });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar chave PIX");
    } finally {
      setSavingPixKey(false);
    }
  };

  const handleCopyPixKey = async () => {
    if (!adminPixKey) return;
    await navigator.clipboard.writeText(adminPixKey);
    setCopied(true);
    toast.success("Chave PIX copiada!");
    setTimeout(() => setCopied(false), 3000);
  };

  const resetPromoForm = () => {
    setPromoForm({
      name: "", code: "", type: "coupon", discount_type: "percent",
      discount_value: "", valid_from: "", valid_until: "", max_uses: "",
      applicable_tiers: [], is_active: true,
    });
    setEditingPromo(null);
  };

  const openNewPromo = () => {
    resetPromoForm();
    setPromoDialogOpen(true);
  };

  const openEditPromo = (promo: Promotion) => {
    setEditingPromo(promo);
    setPromoForm({
      name: promo.name,
      code: promo.code || "",
      type: promo.type as "coupon" | "global",
      discount_type: promo.discount_type as "percent" | "fixed",
      discount_value: String(promo.discount_value),
      valid_from: promo.valid_from ? promo.valid_from.slice(0, 16) : "",
      valid_until: promo.valid_until ? promo.valid_until.slice(0, 16) : "",
      max_uses: promo.max_uses ? String(promo.max_uses) : "",
      applicable_tiers: promo.applicable_tiers || [],
      is_active: promo.is_active,
    });
    setPromoDialogOpen(true);
  };

  const handleSavePromo = async () => {
    if (!promoForm.name.trim() || !promoForm.discount_value) {
      toast.error("Preencha nome e valor do desconto");
      return;
    }
    setSavingPromo(true);
    try {
      const payload = {
        name: promoForm.name,
        code: promoForm.type === "coupon" ? promoForm.code.toUpperCase() || null : null,
        type: promoForm.type,
        discount_type: promoForm.discount_type,
        discount_value: Number(promoForm.discount_value),
        valid_from: promoForm.valid_from ? new Date(promoForm.valid_from).toISOString() : null,
        valid_until: promoForm.valid_until ? new Date(promoForm.valid_until).toISOString() : null,
        max_uses: promoForm.max_uses ? Number(promoForm.max_uses) : null,
        applicable_tiers: promoForm.applicable_tiers.length > 0 ? promoForm.applicable_tiers : null,
        is_active: promoForm.is_active,
        created_by: user?.id,
      };

      if (editingPromo) {
        const { error } = await supabase.from("subscription_promotions").update(payload).eq("id", editingPromo.id);
        if (error) throw error;
        toast.success("Promoção atualizada!");
      } else {
        const { error } = await supabase.from("subscription_promotions").insert(payload);
        if (error) throw error;
        toast.success("Promoção criada!");
      }

      setPromoDialogOpen(false);
      resetPromoForm();
      queryClient.invalidateQueries({ queryKey: ["admin-promotions"] });
    } catch (err: any) {
      console.error(err);
      if (err?.message?.includes("duplicate key")) {
        toast.error("Já existe uma promoção com esse código");
      } else {
        toast.error("Erro ao salvar promoção");
      }
    } finally {
      setSavingPromo(false);
    }
  };

  const handleDeletePromo = async (id: string) => {
    try {
      const { error } = await supabase.from("subscription_promotions").delete().eq("id", id);
      if (error) throw error;
      toast.success("Promoção removida");
      queryClient.invalidateQueries({ queryKey: ["admin-promotions"] });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao remover promoção");
    }
  };

  const getEffectivePrice = (key: SubscriptionTierKey) => {
    const override = tierConfig?.[key];
    return override?.price_brl ?? SUBSCRIPTION_TIERS[key].price_brl;
  };

  const getEffectiveBasePrice = (key: SubscriptionTierKey) => {
    const tierDef = SUBSCRIPTION_TIERS[key];
    if (!("base_price_brl" in tierDef)) return null;
    const override = tierConfig?.[key];
    return override?.base_price_brl ?? (tierDef as any).base_price_brl;
  };

  const getEffectiveMaxStudents = (key: SubscriptionTierKey) => {
    const override = tierConfig?.[key];
    const val = override?.max_students ?? SUBSCRIPTION_TIERS[key].max_students;
    return val === Infinity || val === null ? "Ilimitado" : val;
  };

  return (
    <div className="space-y-6">
      {/* PIX Key */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Chave PIX para receber assinaturas</p>
                <p className="text-xs text-muted-foreground">
                  {adminPixKey ? (
                    <span className="flex items-center gap-1">
                      Configurada: {adminPixKey.slice(0, 20)}...
                      <button onClick={handleCopyPixKey} className="text-primary hover:underline">
                        {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </span>
                  ) : "Não configurada"}
                </p>
              </div>
            </div>
            {editingPixKey ? (
              <div className="flex items-center gap-2">
                <Input value={pixKeyInput} onChange={(e) => setPixKeyInput(e.target.value)} placeholder="Cole sua chave PIX" className="w-64" />
                <Button size="sm" onClick={handleSavePixKey} disabled={savingPixKey || !pixKeyInput}>
                  {savingPixKey ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingPixKey(false)}>Cancelar</Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => { setPixKeyInput(adminPixKey || ""); setEditingPixKey(true); }}>
                {adminPixKey ? "Alterar" : "Configurar"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plans Overview & Edit */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" /> Planos de Assinatura
              </CardTitle>
              <CardDescription>Configure preços e limites dos planos</CardDescription>
            </div>
            {!editingPlans && (
              <Button size="sm" variant="outline" onClick={startEditPlans}>
                <Pencil className="h-4 w-4 mr-1" /> Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingPlans ? (
            <div className="space-y-4">
               {(Object.keys(SUBSCRIPTION_TIERS) as SubscriptionTierKey[]).map((key) => {
                const tierDef = SUBSCRIPTION_TIERS[key];
                const hasBasePrice = "base_price_brl" in tierDef;
                return (
                <div key={key} className="flex flex-wrap items-center gap-4 p-3 rounded-lg border">
                  <span className="font-medium w-24">{tierDef.name}</span>
                  {hasBasePrice && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Taxa fixa R$</Label>
                      <Input
                        type="number"
                        value={planForm[key]?.base_price || ""}
                        onChange={(e) => setPlanForm(prev => ({ ...prev, [key]: { ...prev[key], base_price: e.target.value } }))}
                        className="w-24"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">R$</Label>
                    <Input
                      type="number"
                      value={planForm[key]?.price || ""}
                      onChange={(e) => setPlanForm(prev => ({ ...prev, [key]: { ...prev[key], price: e.target.value } }))}
                      className="w-24"
                    />
                    <Label className="text-xs text-muted-foreground">
                      {tierDef.price_per_student ? "/aluno/mês" : "/mês"}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Max alunos:</Label>
                    <Input
                      type="number"
                      placeholder="Ilimitado"
                      value={planForm[key]?.max_students || ""}
                      onChange={(e) => setPlanForm(prev => ({ ...prev, [key]: { ...prev[key], max_students: e.target.value } }))}
                      className="w-24"
                    />
                  </div>
                </div>
                );
              })}
              <div className="flex gap-2">
                <Button onClick={handleSavePlans} disabled={savingPlans}>
                  {savingPlans ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Salvar planos
                </Button>
                <Button variant="ghost" onClick={() => setEditingPlans(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plano</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Max Alunos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {(Object.keys(SUBSCRIPTION_TIERS) as SubscriptionTierKey[]).map((key) => {
                    const basePrice = getEffectiveBasePrice(key);
                    return (
                    <TableRow key={key}>
                      <TableCell className="font-medium">{SUBSCRIPTION_TIERS[key].name}</TableCell>
                      <TableCell>
                        {basePrice != null && `R$${basePrice} + `}
                        R${getEffectivePrice(key)}
                        {SUBSCRIPTION_TIERS[key].price_per_student ? "/aluno/mês" : "/mês"}
                      </TableCell>
                      <TableCell>{getEffectiveMaxStudents(key)}</TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Promotions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" /> Promoções
              </CardTitle>
              <CardDescription>Cupons de desconto e promoções automáticas</CardDescription>
            </div>
            <Button size="sm" onClick={openNewPromo}>
              <Plus className="h-4 w-4 mr-1" /> Nova promoção
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingPromos ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : promotions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma promoção criada.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead>Usos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promotions.map((promo) => (
                    <TableRow key={promo.id}>
                      <TableCell className="font-medium">{promo.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {promo.type === "coupon" ? "Cupom" : "Global"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {promo.code ? (
                          <code className="bg-muted px-2 py-0.5 rounded text-xs">{promo.code}</code>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {promo.discount_type === "percent" ? `${promo.discount_value}%` : `R$${promo.discount_value}`}
                      </TableCell>
                      <TableCell>
                        {promo.current_uses}{promo.max_uses ? `/${promo.max_uses}` : ""}
                      </TableCell>
                      <TableCell>
                        <Badge variant={promo.is_active ? "default" : "secondary"}>
                          {promo.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEditPromo(promo)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeletePromo(promo.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Promo Dialog */}
      <Dialog open={promoDialogOpen} onOpenChange={(open) => { if (!open) { setPromoDialogOpen(false); resetPromoForm(); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPromo ? "Editar Promoção" : "Nova Promoção"}</DialogTitle>
            <DialogDescription>
              {promoForm.type === "coupon" ? "Cupom com código para o sensei aplicar" : "Desconto automático por período"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={promoForm.name} onChange={(e) => setPromoForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Desconto de Lançamento" />
            </div>

            <div>
              <Label>Tipo</Label>
              <Select value={promoForm.type} onValueChange={(v) => setPromoForm(p => ({ ...p, type: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="coupon">Cupom (código)</SelectItem>
                  <SelectItem value="global">Global (automático)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {promoForm.type === "coupon" && (
              <div>
                <Label>Código do cupom</Label>
                <Input value={promoForm.code} onChange={(e) => setPromoForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="EX: JUDO2026" className="uppercase" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de desconto</Label>
                <Select value={promoForm.discount_type} onValueChange={(v: "percent" | "fixed") => setPromoForm(p => ({ ...p, discount_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Porcentagem (%)</SelectItem>
                    <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor</Label>
                <Input
                  type="number"
                  value={promoForm.discount_value}
                  onChange={(e) => setPromoForm(p => ({ ...p, discount_value: e.target.value }))}
                  placeholder={promoForm.discount_type === "percent" ? "20" : "10"}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Válido de</Label>
                <Input type="datetime-local" value={promoForm.valid_from} onChange={(e) => setPromoForm(p => ({ ...p, valid_from: e.target.value }))} />
              </div>
              <div>
                <Label>Válido até</Label>
                <Input type="datetime-local" value={promoForm.valid_until} onChange={(e) => setPromoForm(p => ({ ...p, valid_until: e.target.value }))} />
              </div>
            </div>

            {promoForm.type === "coupon" && (
              <div>
                <Label>Limite de usos (vazio = ilimitado)</Label>
                <Input type="number" value={promoForm.max_uses} onChange={(e) => setPromoForm(p => ({ ...p, max_uses: e.target.value }))} placeholder="Ilimitado" />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch checked={promoForm.is_active} onCheckedChange={(v) => setPromoForm(p => ({ ...p, is_active: v }))} />
              <Label>Ativa</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => { setPromoDialogOpen(false); resetPromoForm(); }}>Cancelar</Button>
            <Button onClick={handleSavePromo} disabled={savingPromo}>
              {savingPromo ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {editingPromo ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDojoContext } from "@/hooks/useDojoContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CalendarClock, Plus, Loader2, Edit2, Trash2, Play, ChevronDown } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface FeePlan {
  id: string;
  name: string;
  amount: number;
  due_day: number;
  is_active: boolean;
  dojo_id: string;
  created_by: string;
  martial_art_type: string;
}

const MARTIAL_ART_LABELS: Record<string, string> = {
  judo: "Judô",
  bjj: "Jiu-Jitsu (BJJ)",
  judo_bjj: "Judô + BJJ",
};

export function MonthlyFeePlans() {
  const { user } = useAuth();
  const { currentDojoId } = useDojoContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<FeePlan | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateConfirmOpen, setGenerateConfirmOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    due_day: "10",
    martial_art_type: "judo" as string,
  });

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["monthly-fee-plans", currentDojoId],
    queryFn: async () => {
      if (!currentDojoId) return [];
      const { data, error } = await supabase
        .from("monthly_fee_plans")
        .select("*")
        .eq("dojo_id", currentDojoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as FeePlan[];
    },
    enabled: !!currentDojoId,
  });

  const resetForm = () => {
    setFormData({ name: "", amount: "", due_day: "10", martial_art_type: "judo" });
    setEditingPlan(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (plan: FeePlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      amount: String(plan.amount),
      due_day: String(plan.due_day),
      martial_art_type: plan.martial_art_type || "judo",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.amount || !currentDojoId || !user) return;
    setSaving(true);
    try {
      if (editingPlan) {
        const { error } = await supabase
          .from("monthly_fee_plans")
          .update({
            name: formData.name,
            amount: parseFloat(formData.amount),
            due_day: parseInt(formData.due_day),
            martial_art_type: formData.martial_art_type,
          })
          .eq("id", editingPlan.id);
        if (error) throw error;
        toast({ title: "Plano atualizado!" });
      } else {
        const { error } = await supabase
          .from("monthly_fee_plans")
          .insert({
            dojo_id: currentDojoId,
            name: formData.name,
            amount: parseFloat(formData.amount),
            due_day: parseInt(formData.due_day),
            created_by: user.id,
            martial_art_type: formData.martial_art_type,
          });
        if (error) throw error;
        toast({ title: "Plano criado com sucesso!" });
      }

      setDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["monthly-fee-plans"] });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (plan: FeePlan) => {
    try {
      const { error } = await supabase
        .from("monthly_fee_plans")
        .update({ is_active: !plan.is_active })
        .eq("id", plan.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["monthly-fee-plans"] });
      toast({ title: plan.is_active ? "Plano pausado" : "Plano ativado" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from("monthly_fee_plans").delete().eq("id", deleteId);
      if (error) throw error;
      toast({ title: "Plano excluído" });
      queryClient.invalidateQueries({ queryKey: ["monthly-fee-plans"] });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  const handleGenerateNow = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-monthly-payments");
      if (error) throw error;
      const result = data as { generated: number; replaced?: number; message: string };
      toast({
        title: "Mensalidades geradas!",
        description: result.generated > 0
          ? `${result.generated} pagamento(s) criado(s)${result.replaced ? `, ${result.replaced} substituído(s) por multi-arte` : ""}.`
          : "Nenhum novo pagamento gerado (todos já existem ou não há alunos elegíveis).",
      });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    } catch (error: any) {
      toast({ title: "Erro ao gerar mensalidades", description: error.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  if (!currentDojoId) return null;

  return (
    <>
      <Collapsible defaultOpen className="animate-fade-in">
        <Card className="border-accent/20 bg-gradient-to-r from-accent/5 to-transparent shadow-sm">
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-xl group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-accent/10">
                    <CalendarClock className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Mensalidades Programadas</CardTitle>
                    <CardDescription>Cobranças por arte marcial geradas mensalmente</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setGenerateConfirmOpen(true)} disabled={generating || !plans || plans.length === 0}>
                      {generating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                      <span className="hidden sm:inline">Gerar Agora</span>
                    </Button>
                    <Button size="sm" onClick={openCreate}>
                      <Plus className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Novo Plano</span><span className="sm:hidden">Novo</span>
                    </Button>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {plansLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : plans && plans.length > 0 ? (
                <div className="space-y-3">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        plan.is_active
                          ? "bg-card border-border"
                          : "bg-muted/30 border-muted opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{plan.name}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {MARTIAL_ART_LABELS[plan.martial_art_type] || plan.martial_art_type}
                            </Badge>
                            {!plan.is_active && <Badge variant="secondary" className="text-[10px]">Pausado</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatCurrency(plan.amount)} • Vencimento dia {plan.due_day}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Switch checked={plan.is_active} onCheckedChange={() => handleToggleActive(plan)} />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(plan)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(plan.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum plano criado. Crie um plano para gerar mensalidades automaticamente.
                </p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              {editingPlan ? "Editar Plano" : "Novo Plano de Mensalidade"}
            </DialogTitle>
            <DialogDescription>
              Defina o valor, dia de vencimento e a arte marcial para a cobrança mensal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Plano</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Mensalidade Judô"
              />
            </div>
            <div className="space-y-2">
              <Label>Arte Marcial</Label>
              <Select
                value={formData.martial_art_type}
                onValueChange={(value) => setFormData({ ...formData, martial_art_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a arte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="judo">🥋 Judô</SelectItem>
                  <SelectItem value="bjj">🥋 Jiu-Jitsu (BJJ)</SelectItem>
                  <SelectItem value="judo_bjj">🥋 Judô + BJJ (multi-arte)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.martial_art_type === "judo_bjj"
                  ? "Será gerada apenas para alunos matriculados em turmas de AMBAS as artes."
                  : `Será gerada para todos os alunos em turmas de ${MARTIAL_ART_LABELS[formData.martial_art_type] || formData.martial_art_type}.`}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="150.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Dia de Vencimento</Label>
                <Input
                  type="number"
                  min="1"
                  max="28"
                  value={formData.due_day}
                  onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
                  placeholder="10"
                />
              </div>
            </div>
            <div className="p-3 bg-muted/30 rounded-xl border border-border/50">
              <p className="text-xs text-muted-foreground">
                💡 A mensalidade será gerada automaticamente todo mês. Alunos bolsistas são ignorados. 
                {formData.martial_art_type === "judo_bjj" && " Mensalidades individuais de Judô/BJJ serão substituídas pela combinada."}
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.name || !formData.amount || saving}
              >
                {saving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
                ) : editingPlan ? (
                  "Atualizar"
                ) : (
                  <><Plus className="h-4 w-4 mr-1" /> Criar Plano</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano?</AlertDialogTitle>
            <AlertDialogDescription>
              O plano será removido permanentemente. Pagamentos já gerados não serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generate Confirmation */}
      <AlertDialog open={generateConfirmOpen} onOpenChange={setGenerateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gerar mensalidades agora?</AlertDialogTitle>
            <AlertDialogDescription>
              As mensalidades do mês atual serão geradas por arte marcial. Alunos em Judô+BJJ receberão apenas a mensalidade combinada (substituindo individuais). Bolsistas e pagamentos existentes são ignorados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleGenerateNow}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Gerar Mensalidades
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

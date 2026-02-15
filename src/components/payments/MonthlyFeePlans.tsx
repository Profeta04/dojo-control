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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CalendarClock, Plus, Loader2, Edit2, Trash2, GraduationCap, Play, ChevronDown } from "lucide-react";
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
  monthly_fee_plan_classes: { class_id: string }[];
}

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
    selectedClasses: [] as string[],
  });

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["monthly-fee-plans", currentDojoId],
    queryFn: async () => {
      if (!currentDojoId) return [];
      const { data, error } = await supabase
        .from("monthly_fee_plans")
        .select("*, monthly_fee_plan_classes(class_id)")
        .eq("dojo_id", currentDojoId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as FeePlan[];
    },
    enabled: !!currentDojoId,
  });

  const { data: classes } = useQuery({
    queryKey: ["classes-for-plans", currentDojoId],
    queryFn: async () => {
      if (!currentDojoId) return [];
      const { data, error } = await supabase
        .from("classes")
        .select("id, name")
        .eq("dojo_id", currentDojoId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentDojoId,
  });

  const resetForm = () => {
    setFormData({ name: "", amount: "", due_day: "10", selectedClasses: [] });
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
      selectedClasses: plan.monthly_fee_plan_classes.map((pc) => pc.class_id),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.amount || !currentDojoId || !user) return;
    if (formData.selectedClasses.length === 0) {
      toast({ title: "Selecione ao menos uma turma", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editingPlan) {
        // Update plan
        const { error } = await supabase
          .from("monthly_fee_plans")
          .update({
            name: formData.name,
            amount: parseFloat(formData.amount),
            due_day: parseInt(formData.due_day),
          })
          .eq("id", editingPlan.id);
        if (error) throw error;

        // Update classes: delete old, insert new
        await supabase.from("monthly_fee_plan_classes").delete().eq("plan_id", editingPlan.id);
        const classInserts = formData.selectedClasses.map((classId) => ({
          plan_id: editingPlan.id,
          class_id: classId,
        }));
        const { error: classError } = await supabase.from("monthly_fee_plan_classes").insert(classInserts);
        if (classError) throw classError;

        toast({ title: "Plano atualizado!" });
      } else {
        // Create plan
        const { data: newPlan, error } = await supabase
          .from("monthly_fee_plans")
          .insert({
            dojo_id: currentDojoId,
            name: formData.name,
            amount: parseFloat(formData.amount),
            due_day: parseInt(formData.due_day),
            created_by: user.id,
          })
          .select("id")
          .single();
        if (error) throw error;

        // Insert classes
        const classInserts = formData.selectedClasses.map((classId) => ({
          plan_id: newPlan.id,
          class_id: classId,
        }));
        const { error: classError } = await supabase.from("monthly_fee_plan_classes").insert(classInserts);
        if (classError) throw classError;

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
      const result = data as { generated: number; message: string };
      toast({
        title: "Mensalidades geradas!",
        description: result.generated > 0
          ? `${result.generated} pagamento(s) criado(s) com sucesso.`
          : "Nenhum novo pagamento gerado (todos já existem ou não há alunos elegíveis).",
      });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    } catch (error: any) {
      toast({ title: "Erro ao gerar mensalidades", description: error.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const toggleClass = (classId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedClasses: prev.selectedClasses.includes(classId)
        ? prev.selectedClasses.filter((id) => id !== classId)
        : [...prev.selectedClasses, classId],
    }));
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
                    <CardDescription>Cobranças automáticas geradas mensalmente</CardDescription>
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
...
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
              Defina o valor, dia de vencimento e turmas que receberão a cobrança mensal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Plano</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Mensalidade Infantil"
              />
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
            <div className="space-y-2">
              <Label>Turmas</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-[200px] overflow-y-auto">
                {classes && classes.length > 0 ? (
                  classes.map((cls) => (
                    <label
                      key={cls.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded-md transition-colors"
                    >
                      <Checkbox
                        checked={formData.selectedClasses.includes(cls.id)}
                        onCheckedChange={() => toggleClass(cls.id)}
                      />
                      <span className="text-sm">{cls.name}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma turma ativa encontrada.</p>
                )}
              </div>
              {formData.selectedClasses.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formData.selectedClasses.length} turma(s) selecionada(s)
                </p>
              )}
            </div>
            <div className="p-3 bg-muted/30 rounded-xl border border-border/50">
              <p className="text-xs text-muted-foreground">
                💡 A mensalidade será gerada automaticamente todo mês para os alunos das turmas selecionadas. Alunos bolsistas são ignorados.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.name || !formData.amount || formData.selectedClasses.length === 0 || saving}
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
              As mensalidades do mês atual serão geradas para todos os alunos elegíveis dos planos ativos. Alunos bolsistas e que já possuem mensalidade neste mês serão ignorados.
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

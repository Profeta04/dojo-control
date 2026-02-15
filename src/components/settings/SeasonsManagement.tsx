import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Calendar, Edit, Plus, Power, PowerOff, Sparkles, Sun, Leaf, Snowflake, Flower2, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Season {
  id: string;
  name: string;
  slug: string;
  theme: string;
  year: number;
  quarter: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  xp_multiplier: number;
  color_primary: string;
  color_accent: string;
  icon: string;
  title_reward: string | null;
  border_style: string | null;
}

const THEME_CONFIG: Record<string, { label: string; icon: React.ReactNode; gradient: string }> = {
  verao: { label: "Verão", icon: <Sun className="h-4 w-4" />, gradient: "from-orange-500 to-amber-400" },
  outono: { label: "Outono", icon: <Leaf className="h-4 w-4" />, gradient: "from-amber-700 to-orange-600" },
  inverno: { label: "Inverno", icon: <Snowflake className="h-4 w-4" />, gradient: "from-blue-500 to-cyan-400" },
  primavera: { label: "Primavera", icon: <Flower2 className="h-4 w-4" />, gradient: "from-green-500 to-emerald-400" },
};

const DEFAULT_ICONS: Record<string, string> = {
  verao: "🔥", outono: "🍂", inverno: "❄️", primavera: "🌸",
};

const DEFAULT_COLORS: Record<string, { primary: string; accent: string }> = {
  verao: { primary: "#f97316", accent: "#f59e0b" },
  outono: { primary: "#b45309", accent: "#ea580c" },
  inverno: { primary: "#3b82f6", accent: "#22d3ee" },
  primavera: { primary: "#22c55e", accent: "#a3e635" },
};

function SeasonForm({ season, onSave, onClose }: { season?: Season; onSave: (data: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    name: season?.name || "",
    slug: season?.slug || "",
    theme: season?.theme || "verao",
    year: season?.year || new Date().getFullYear(),
    quarter: season?.quarter || 1,
    start_date: season?.start_date || "",
    end_date: season?.end_date || "",
    xp_multiplier: season?.xp_multiplier || 1,
    icon: season?.icon || "🔥",
    color_primary: season?.color_primary || "#f97316",
    color_accent: season?.color_accent || "#f59e0b",
    title_reward: season?.title_reward || "",
    border_style: season?.border_style || "",
  });

  const handleThemeChange = (theme: string) => {
    setForm(prev => ({
      ...prev,
      theme,
      icon: DEFAULT_ICONS[theme] || prev.icon,
      color_primary: DEFAULT_COLORS[theme]?.primary || prev.color_primary,
      color_accent: DEFAULT_COLORS[theme]?.accent || prev.color_accent,
      slug: `${theme}-${prev.year}`,
    }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Nome</Label>
          <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Verão 2026" />
        </div>
        <div>
          <Label className="text-xs">Slug</Label>
          <Input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} placeholder="verao-2026" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Tema</Label>
          <Select value={form.theme} onValueChange={handleThemeChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(THEME_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>
                  <span className="flex items-center gap-2">{cfg.icon} {cfg.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Ano</Label>
          <Input type="number" value={form.year} onChange={e => setForm(p => ({ ...p, year: parseInt(e.target.value) }))} />
        </div>
        <div>
          <Label className="text-xs">Trimestre</Label>
          <Select value={String(form.quarter)} onValueChange={v => setForm(p => ({ ...p, quarter: parseInt(v) }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Q1</SelectItem>
              <SelectItem value="2">Q2</SelectItem>
              <SelectItem value="3">Q3</SelectItem>
              <SelectItem value="4">Q4</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Início</Label>
          <Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Fim</Label>
          <Input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Multiplicador XP</Label>
          <Input type="number" step="0.1" min="0.5" max="5" value={form.xp_multiplier} onChange={e => setForm(p => ({ ...p, xp_multiplier: parseFloat(e.target.value) }))} />
        </div>
        <div>
          <Label className="text-xs">Ícone</Label>
          <Input value={form.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Título Recompensa</Label>
          <Input value={form.title_reward} onChange={e => setForm(p => ({ ...p, title_reward: e.target.value }))} placeholder="Guerreiro do Verão" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Cor Primária</Label>
          <div className="flex gap-2">
            <Input type="color" value={form.color_primary} onChange={e => setForm(p => ({ ...p, color_primary: e.target.value }))} className="w-12 h-9 p-1 cursor-pointer" />
            <Input value={form.color_primary} onChange={e => setForm(p => ({ ...p, color_primary: e.target.value }))} className="flex-1" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Cor Accent</Label>
          <div className="flex gap-2">
            <Input type="color" value={form.color_accent} onChange={e => setForm(p => ({ ...p, color_accent: e.target.value }))} className="w-12 h-9 p-1 cursor-pointer" />
            <Input value={form.color_accent} onChange={e => setForm(p => ({ ...p, color_accent: e.target.value }))} className="flex-1" />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => onSave(form)}>Salvar</Button>
      </DialogFooter>
    </div>
  );
}

export function SeasonsManagement() {
  const queryClient = useQueryClient();
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: seasons = [], isLoading } = useQuery({
    queryKey: ["admin-seasons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seasons")
        .select("*")
        .order("year", { ascending: false })
        .order("quarter", { ascending: false });
      if (error) throw error;
      return data as Season[];
    },
  });

  const createSeason = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from("seasons").insert({
        ...form,
        is_active: false,
        title_reward: form.title_reward || null,
        border_style: form.border_style || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-seasons"] });
      toast.success("Temporada criada!");
      setIsCreateOpen(false);
    },
    onError: () => toast.error("Erro ao criar temporada"),
  });

  const updateSeason = useMutation({
    mutationFn: async ({ id, ...form }: any) => {
      const { error } = await supabase.from("seasons").update({
        ...form,
        title_reward: form.title_reward || null,
        border_style: form.border_style || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-seasons"] });
      queryClient.invalidateQueries({ queryKey: ["active-season"] });
      toast.success("Temporada atualizada!");
      setEditingSeason(null);
    },
    onError: () => toast.error("Erro ao atualizar temporada"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, activate }: { id: string; activate: boolean }) => {
      if (activate) {
        // Deactivate all others first
        await supabase.from("seasons").update({ is_active: false }).neq("id", id);
      }
      const { error } = await supabase.from("seasons").update({ is_active: activate }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-seasons"] });
      queryClient.invalidateQueries({ queryKey: ["active-season"] });
      toast.success("Status da temporada atualizado!");
    },
    onError: () => toast.error("Erro ao alterar status"),
  });

  const activeSeason = seasons.find(s => s.is_active);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Temporadas
          </h3>
          <p className="text-sm text-muted-foreground">Gerencie ciclos trimestrais com temas e recompensas</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Nova Temporada
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Temporada</DialogTitle>
            </DialogHeader>
            <SeasonForm onSave={(data) => createSeason.mutate(data)} onClose={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Season Highlight */}
      {activeSeason && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{activeSeason.icon}</span>
                <div>
                  <p className="font-semibold text-sm">{activeSeason.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Ativa · Multiplicador: {activeSeason.xp_multiplier}x
                  </p>
                </div>
              </div>
              <Badge className="bg-accent text-accent-foreground">Ativa</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seasons List */}
      <div className="space-y-2">
        {seasons.map((season) => {
          const theme = THEME_CONFIG[season.theme];
          return (
            <Card key={season.id} className={cn(season.is_active && "ring-1 ring-accent/30")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br text-white",
                      theme?.gradient || "from-muted to-muted"
                    )}>
                      <span className="text-lg">{season.icon}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{season.name}</p>
                        {season.is_active && (
                          <Badge variant="default" className="text-[10px] h-4 bg-accent text-accent-foreground">Ativa</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(season.start_date), "dd/MM/yy")} - {format(new Date(season.end_date), "dd/MM/yy")}
                        </span>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {season.xp_multiplier}x XP
                        </span>
                        {season.title_reward && (
                          <Badge variant="outline" className="text-[10px] h-4">
                            🏆 {season.title_reward}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleActive.mutate({ id: season.id, activate: !season.is_active })}
                      title={season.is_active ? "Desativar" : "Ativar"}
                    >
                      {season.is_active ? (
                        <PowerOff className="h-4 w-4 text-destructive" />
                      ) : (
                        <Power className="h-4 w-4 text-success" />
                      )}
                    </Button>

                    <Dialog open={editingSeason?.id === season.id} onOpenChange={(open) => !open && setEditingSeason(null)}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingSeason(season)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Editar Temporada</DialogTitle>
                        </DialogHeader>
                        <SeasonForm
                          season={season}
                          onSave={(data) => updateSeason.mutate({ id: season.id, ...data })}
                          onClose={() => setEditingSeason(null)}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDojoContext } from "@/hooks/useDojoContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Palette, Loader2, RotateCcw, Check, Users, Trophy, CreditCard, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Color Utilities ────────────────────────────────────────────

function hslToHex(hsl: string): string {
  try {
    const [h, s, l] = hsl.split(" ").map((v) => parseFloat(v.replace("%", "")));
    const sNorm = s / 100;
    const lNorm = l / 100;
    const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = lNorm - c / 2;
    let r = 0, g = 0, b = 0;
    if (h >= 0 && h < 60) { r = c; g = x; }
    else if (h >= 60 && h < 120) { r = x; g = c; }
    else if (h >= 120 && h < 180) { g = c; b = x; }
    else if (h >= 180 && h < 240) { g = x; b = c; }
    else if (h >= 240 && h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  } catch { return "#000000"; }
}

function hexToHsl(hex: string): string {
  try {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return "0 0% 0%";
    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  } catch { return "0 0% 0%"; }
}

// ─── Color Picker Component ────────────────────────────────────

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}

function ColorPicker({ label, value, onChange, description }: ColorPickerProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-2 items-center">
        <div className="relative">
          <Input
            type="color"
            value={hslToHex(value)}
            onChange={(e) => onChange(hexToHsl(e.target.value))}
            className="w-12 h-10 p-1 cursor-pointer rounded-lg border-2"
          />
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0 0% 100%"
          className="font-mono text-xs flex-1"
        />
      </div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

// ─── Preset Palettes ────────────────────────────────────────────

interface PalettePreset {
  name: string;
  colors: { color_primary: string; color_secondary: string; color_tertiary: string };
}

const PALETTES: PalettePreset[] = [
  {
    name: "Clássico",
    colors: { color_primary: "220 15% 20%", color_secondary: "220 10% 92%", color_tertiary: "4 85% 50%" },
  },
  {
    name: "Oceano",
    colors: { color_primary: "210 30% 18%", color_secondary: "210 20% 93%", color_tertiary: "195 80% 45%" },
  },
  {
    name: "Floresta",
    colors: { color_primary: "150 25% 18%", color_secondary: "150 15% 92%", color_tertiary: "145 65% 38%" },
  },
  {
    name: "Noturno",
    colors: { color_primary: "250 20% 15%", color_secondary: "250 12% 90%", color_tertiary: "265 70% 55%" },
  },
  {
    name: "Terracota",
    colors: { color_primary: "25 20% 22%", color_secondary: "30 15% 92%", color_tertiary: "20 75% 48%" },
  },
  {
    name: "Dourado",
    colors: { color_primary: "35 15% 18%", color_secondary: "40 12% 93%", color_tertiary: "45 85% 48%" },
  },
  {
    name: "Sakura",
    colors: { color_primary: "340 20% 22%", color_secondary: "340 15% 93%", color_tertiary: "340 70% 55%" },
  },
  {
    name: "Samurai",
    colors: { color_primary: "0 15% 12%", color_secondary: "0 8% 90%", color_tertiary: "0 80% 45%" },
  },
  {
    name: "Zen",
    colors: { color_primary: "160 10% 22%", color_secondary: "160 8% 93%", color_tertiary: "160 40% 42%" },
  },
];

function PaletteSelector({ onSelect, currentColors }: {
  onSelect: (colors: PalettePreset["colors"]) => void;
  currentColors: PalettePreset["colors"];
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {PALETTES.map((palette) => {
        const isActive =
          palette.colors.color_primary === currentColors.color_primary &&
          palette.colors.color_secondary === currentColors.color_secondary &&
          palette.colors.color_tertiary === currentColors.color_tertiary;

        return (
          <button
            key={palette.name}
            onClick={() => onSelect(palette.colors)}
            className={cn(
              "relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all hover:scale-[1.02]",
              isActive
                ? "border-accent ring-2 ring-accent/30 bg-accent/5"
                : "border-border hover:border-accent/50"
            )}
          >
            {isActive && (
              <div className="absolute top-1.5 right-1.5">
                <Check className="h-3.5 w-3.5 text-accent" />
              </div>
            )}
            <div className="flex gap-1.5">
              <div
                className="w-7 h-7 rounded-full border border-border/50 shadow-sm"
                style={{ backgroundColor: `hsl(${palette.colors.color_primary})` }}
              />
              <div
                className="w-7 h-7 rounded-full border border-border/50 shadow-sm"
                style={{ backgroundColor: `hsl(${palette.colors.color_secondary})` }}
              />
              <div
                className="w-7 h-7 rounded-full border border-border/50 shadow-sm"
                style={{ backgroundColor: `hsl(${palette.colors.color_tertiary})` }}
              />
            </div>
            <span className="text-xs font-medium text-foreground">{palette.name}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Enhanced Preview ───────────────────────────────────────────

function ThemePreview({ colors, isDark }: {
  colors: PalettePreset["colors"];
  isDark: boolean;
}) {
  const bg = isDark ? "hsl(220 15% 8%)" : "hsl(220 15% 98%)";
  const fg = isDark ? "hsl(220 10% 93%)" : "hsl(220 15% 10%)";
  const cardBg = isDark ? "hsl(220 15% 12%)" : "hsl(0 0% 100%)";
  const mutedFg = isDark ? "hsl(220 10% 60%)" : "hsl(220 10% 45%)";
  const borderColor = isDark ? "hsl(220 13% 25%)" : "hsl(220 13% 88%)";
  const sidebarBg = isDark ? "hsl(220 15% 6%)" : `hsl(${colors.color_primary})`;
  const sidebarFg = isDark ? "hsl(220 10% 88%)" : "hsl(0 0% 95%)";
  const accentBg = `hsl(${colors.color_tertiary})`;

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor }}>
      <div className="flex" style={{ minHeight: 220 }}>
        {/* Mini Sidebar */}
        <div
          className="w-[140px] sm:w-[160px] flex-shrink-0 flex flex-col p-3 gap-2"
          style={{ backgroundColor: sidebarBg, color: sidebarFg }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md" style={{ backgroundColor: accentBg }} />
            <span className="text-xs font-bold truncate">Meu Dojo</span>
          </div>
          <div className="space-y-1">
            {[
              { icon: LayoutDashboard, label: "Dashboard", active: true },
              { icon: Users, label: "Alunos", active: false },
              { icon: CreditCard, label: "Pagamentos", active: false },
              { icon: Trophy, label: "Graduações", active: false },
            ].map(({ icon: Icon, label, active }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs"
                style={{
                  backgroundColor: active
                    ? isDark ? "hsla(220, 15%, 16%, 1)" : "hsla(220, 15%, 30%, 1)"
                    : "transparent",
                  opacity: active ? 1 : 0.7,
                }}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 flex flex-col gap-3" style={{ backgroundColor: bg, color: fg }}>
          <h4 className="text-sm font-semibold">Dashboard</h4>
          <div className="grid grid-cols-2 gap-2">
            {["Alunos Ativos", "Turmas", "Pagamentos", "Graduações"].map((title, i) => (
              <div
                key={title}
                className="rounded-lg p-2.5 flex flex-col gap-1"
                style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
              >
                <span className="text-[10px]" style={{ color: mutedFg }}>{title}</span>
                <span className="text-base font-bold">{[23, 4, 12, 3][i]}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-1">
            <button
              className="px-3 py-1.5 rounded-md text-xs font-medium text-white"
              style={{ backgroundColor: accentBg }}
            >
              Ação Principal
            </button>
            <button
              className="px-3 py-1.5 rounded-md text-xs font-medium"
              style={{
                backgroundColor: `hsl(${colors.color_secondary})`,
                color: isDark ? "hsl(220 10% 90%)" : "hsl(220 15% 15%)",
              }}
            >
              Secundário
            </button>
          </div>
          <div className="flex items-center gap-3 mt-auto">
            <span className="text-xs font-medium" style={{ color: accentBg }}>
              Link de exemplo
            </span>
            <span className="text-xs" style={{ color: mutedFg }}>
              Texto auxiliar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Default Colors ─────────────────────────────────────────────

const DEFAULT_COLORS = {
  color_primary: "220 15% 20%",
  color_secondary: "220 10% 92%",
  color_tertiary: "4 85% 50%",
};

// ─── Main Component ─────────────────────────────────────────────

export function DojoThemeSettings() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentDojoId, setCurrentDojoId, userDojos, isLoadingDojos } = useDojoContext();

  const dojoId = currentDojoId ?? (userDojos.length === 1 ? userDojos[0].id : null);
  const dojoName = dojoId ? userDojos.find((d) => d.id === dojoId)?.name : undefined;

  const darkMode = profile?.dark_mode ?? false;
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [savedColors, setSavedColors] = useState(DEFAULT_COLORS);
  const [hasChanges, setHasChanges] = useState(false);

  // Safety: ensure a single-dojo user always has a dojo selected
  useEffect(() => {
    if (!currentDojoId && userDojos.length === 1) {
      setCurrentDojoId(userDojos[0].id);
    }
  }, [currentDojoId, userDojos, setCurrentDojoId]);

  // Fetch current dojo colors
  useEffect(() => {
    const fetchColors = async () => {
      if (!dojoId) return;
      const { data } = await supabase
        .from("dojos")
        .select("color_primary, color_secondary, color_accent")
        .eq("id", dojoId)
        .single();
      if (data) {
        const fetched = {
          color_primary: data.color_primary || DEFAULT_COLORS.color_primary,
          color_secondary: data.color_secondary || DEFAULT_COLORS.color_secondary,
          color_tertiary: data.color_accent || DEFAULT_COLORS.color_tertiary,
        };
        setColors(fetched);
        setSavedColors(fetched);
        setHasChanges(false);
      }
    };
    fetchColors();
  }, [dojoId]);

  // Live preview: apply CSS variables in real-time as user picks colors
  useEffect(() => {
    if (!hasChanges) return;
    const root = document.documentElement;
    // Temporarily apply the colors for live preview
    root.style.setProperty("--color-primary", colors.color_primary);
    root.style.setProperty("--color-secondary", colors.color_secondary);
    root.style.setProperty("--color-tertiary", colors.color_tertiary);
    // Also update sidebar background for immediate feedback
    if (!darkMode) {
      root.style.setProperty("--sidebar-background", colors.color_primary);
    }
    root.style.setProperty("--accent", colors.color_tertiary);
    root.style.setProperty("--sidebar-primary", colors.color_tertiary);
    root.style.setProperty("--sidebar-ring", colors.color_tertiary);
    root.style.setProperty("--ring", colors.color_tertiary);
  }, [colors, hasChanges, darkMode]);

  // Revert live preview if user navigates away without saving
  useEffect(() => {
    return () => {
      // On unmount, trigger full theme recalculation
      queryClient.invalidateQueries({ queryKey: ["dojo-theme"] });
    };
  }, [queryClient]);

  const updateColorsMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Você precisa estar logado para alterar as cores");
      if (!dojoId) throw new Error("Selecione um dojo para alterar as cores");
      const { error } = await supabase
        .from("dojos")
        .update({
          color_primary: colors.color_primary,
          color_secondary: colors.color_secondary,
          color_accent: colors.color_tertiary,
        })
        .eq("id", dojoId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Tema atualizado com sucesso!" });
      setSavedColors(colors);
      queryClient.invalidateQueries({ queryKey: ["dojo-theme"] });
      setHasChanges(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar tema",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleColorChange = useCallback((key: keyof typeof colors, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  const handlePaletteSelect = useCallback((paletteColors: PalettePreset["colors"]) => {
    setColors(paletteColors);
    setHasChanges(true);
  }, []);

  const handleReset = useCallback(() => {
    setColors(DEFAULT_COLORS);
    setHasChanges(true);
  }, []);

  const handleRevert = useCallback(() => {
    setColors(savedColors);
    setHasChanges(false);
    // Restore saved colors
    queryClient.invalidateQueries({ queryKey: ["dojo-theme"] });
  }, [savedColors, queryClient]);

  if (isLoadingDojos) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" aria-hidden="true" />
            Personalização de Cores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Carregando dojos...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!dojoId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" aria-hidden="true" />
            Personalização de Cores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {userDojos.length > 0 ? (
            <>
              <p className="text-muted-foreground">
                Selecione um dojo para personalizar as cores do tema.
              </p>
              <div className="space-y-2">
                <Label>Dojo</Label>
                <Select value={undefined} onValueChange={(value) => setCurrentDojoId(value)}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Selecione o dojo" />
                  </SelectTrigger>
                  <SelectContent>
                    {userDojos.map((dojo) => (
                      <SelectItem key={dojo.id} value={dojo.id}>
                        {dojo.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">
              Nenhum dojo ativo disponível para sua conta.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Palettes Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5" aria-hidden="true" />
            Paletas de Cores
          </CardTitle>
          <CardDescription>
            Escolha uma paleta predefinida ou personalize as cores manualmente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaletteSelector onSelect={handlePaletteSelect} currentColors={colors} />
        </CardContent>
      </Card>

      {/* Custom Colors Card */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-lg">Cores Personalizadas</CardTitle>
            <CardDescription>
              {dojoName
                ? `Ajuste fino das cores do dojo: ${dojoName}`
                : "Customize as 3 cores principais do tema"}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <Button variant="ghost" size="sm" onClick={handleRevert}>
                Cancelar
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" aria-hidden="true" />
              Padrão
            </Button>
            <Button
              size="sm"
              onClick={() => updateColorsMutation.mutate()}
              disabled={!hasChanges || updateColorsMutation.isPending}
            >
              {updateColorsMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden="true" />
              )}
              Salvar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <ColorPicker
              label="Cor Primária"
              value={colors.color_primary}
              onChange={(v) => handleColorChange("color_primary", v)}
              description="Barra lateral e elementos principais"
            />
            <ColorPicker
              label="Cor Secundária"
              value={colors.color_secondary}
              onChange={(v) => handleColorChange("color_secondary", v)}
              description="Fundos de cards e seções"
            />
            <ColorPicker
              label="Cor de Destaque"
              value={colors.color_tertiary}
              onChange={(v) => handleColorChange("color_tertiary", v)}
              description="Botões, links e elementos interativos"
            />
          </div>
        </CardContent>
      </Card>

      {/* Live Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pré-visualização</CardTitle>
          <CardDescription>
            Veja como as cores ficam distribuídas na interface ({darkMode ? "modo escuro" : "modo claro"})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemePreview colors={colors} isDark={darkMode} />
        </CardContent>
      </Card>
    </div>
  );
}

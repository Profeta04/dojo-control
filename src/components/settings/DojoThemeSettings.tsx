import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Palette, Loader2, RotateCcw, Moon, Sun } from "lucide-react";

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}

function ColorPicker({ label, value, onChange, description }: ColorPickerProps) {
  // Convert HSL string to hex for the color picker
  const hslToHex = (hsl: string): string => {
    try {
      const [h, s, l] = hsl.split(" ").map((v) => parseFloat(v.replace("%", "")));
      const sNorm = s / 100;
      const lNorm = l / 100;

      const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
      const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      const m = lNorm - c / 2;

      let r = 0, g = 0, b = 0;
      if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
      else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
      else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
      else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
      else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
      else { r = c; g = 0; b = x; }

      const toHex = (n: number) =>
        Math.round((n + m) * 255).toString(16).padStart(2, "0");
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    } catch {
      return "#000000";
    }
  };

  // Convert hex to HSL string
  const hexToHsl = (hex: string): string => {
    try {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return "0 0% 0%";

      let r = parseInt(result[1], 16) / 255;
      let g = parseInt(result[2], 16) / 255;
      let b = parseInt(result[3], 16) / 255;

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
    } catch {
      return "0 0% 0%";
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          type="color"
          value={hslToHex(value)}
          onChange={(e) => onChange(hexToHsl(e.target.value))}
          className="w-14 h-10 p-1 cursor-pointer"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0 0% 100%"
          className="font-mono text-sm"
        />
      </div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

const DEFAULT_LIGHT_COLORS = {
  color_primary: "220 15% 20%",
  color_secondary: "220 10% 92%",
  color_tertiary: "4 85% 50%",
};

const DEFAULT_DARK_COLORS = {
  color_primary: "220 15% 95%",
  color_secondary: "220 10% 18%",
  color_tertiary: "4 85% 55%",
};

export function DojoThemeSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentDojoId, setCurrentDojoId, userDojos, isLoadingDojos } = useDojoContext();

  const dojoId = currentDojoId ?? (userDojos.length === 1 ? userDojos[0].id : null);
  const dojoName = dojoId ? userDojos.find((d) => d.id === dojoId)?.name : undefined;

  const [darkMode, setDarkMode] = useState(false);
  const [colors, setColors] = useState(DEFAULT_LIGHT_COLORS);
  const [hasChanges, setHasChanges] = useState(false);

  const getDefaultColors = (isDark: boolean) => isDark ? DEFAULT_DARK_COLORS : DEFAULT_LIGHT_COLORS;

  // Safety: ensure a single-dojo user always has a dojo selected
  useEffect(() => {
    if (!currentDojoId && userDojos.length === 1) {
      setCurrentDojoId(userDojos[0].id);
    }
  }, [currentDojoId, userDojos, setCurrentDojoId]);

  // Fetch current dojo colors (based on selected dojo)
  useEffect(() => {
    const fetchColors = async () => {
      if (!dojoId) return;

      const { data } = await supabase
        .from("dojos")
        .select("color_primary, color_secondary, color_accent, dark_mode")
        .eq("id", dojoId)
        .single();

      if (data) {
        const isDark = data.dark_mode ?? false;
        const defaults = getDefaultColors(isDark);
        setDarkMode(isDark);
        setColors({
          color_primary: data.color_primary || defaults.color_primary,
          color_secondary: data.color_secondary || defaults.color_secondary,
          color_tertiary: data.color_accent || defaults.color_tertiary,
        });
        setHasChanges(false);
      }
    };

    fetchColors();
  }, [dojoId]);

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
          dark_mode: darkMode,
        })
        .eq("id", dojoId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Tema atualizado com sucesso!" });
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

  const handleColorChange = (key: keyof typeof colors, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleDarkModeToggle = (enabled: boolean) => {
    setDarkMode(enabled);
    setColors(getDefaultColors(enabled));
    setHasChanges(true);
  };

  const handleReset = () => {
    setColors(getDefaultColors(darkMode));
    setHasChanges(true);
  };

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
                <Select
                  value={undefined}
                  onValueChange={(value) => setCurrentDojoId(value)}
                >
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
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" aria-hidden="true" />
            Personalização de Cores
          </CardTitle>
          <CardDescription>
            {dojoName
              ? `Personalize o tema do dojo: ${dojoName}`
              : "Customize as 3 cores principais do tema"}
          </CardDescription>
        </div>
        <div className="flex gap-2">
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
      <CardContent>
        {/* Dark Mode Toggle */}
        <div className="mb-6 p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {darkMode ? (
                <Moon className="h-5 w-5 text-accent" aria-hidden="true" />
              ) : (
                <Sun className="h-5 w-5 text-accent" aria-hidden="true" />
              )}
              <div>
                <Label htmlFor="dark-mode-toggle" className="text-base font-medium">
                  Modo Escuro
                </Label>
                <p className="text-sm text-muted-foreground">
                  Alterne entre tema claro e escuro
                </p>
              </div>
            </div>
            <Switch
              id="dark-mode-toggle"
              checked={darkMode}
              onCheckedChange={handleDarkModeToggle}
            />
          </div>
        </div>

        {/* 3 Color Pickers */}
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-4">Cores do Tema</h4>
          <div className="grid gap-6 sm:grid-cols-3">
            <ColorPicker
              label="Cor Primária"
              value={colors.color_primary}
              onChange={(v) => handleColorChange("color_primary", v)}
              description="Barra lateral e botões principais"
            />
            <ColorPicker
              label="Cor Secundária"
              value={colors.color_secondary}
              onChange={(v) => handleColorChange("color_secondary", v)}
              description="Fundos de elementos secundários"
            />
            <ColorPicker
              label="Cor de Destaque"
              value={colors.color_tertiary}
              onChange={(v) => handleColorChange("color_tertiary", v)}
              description="Links, ícones e destaques"
            />
          </div>
        </div>

        {/* Preview */}
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: darkMode ? "hsl(220 15% 8%)" : "hsl(220 15% 98%)",
            color: darkMode ? "hsl(220 10% 95%)" : "hsl(220 15% 10%)",
          }}
        >
          <h4 className="font-semibold mb-3">Pré-visualização</h4>
          <div className="flex flex-wrap gap-3">
            <button
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: `hsl(${colors.color_primary})`,
                color: darkMode ? "hsl(220 15% 8%)" : "hsl(0 0% 98%)",
              }}
            >
              Botão Primário
            </button>
            <button
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: `hsl(${colors.color_secondary})`,
                color: darkMode ? "hsl(220 10% 90%)" : "hsl(220 15% 15%)",
              }}
            >
              Botão Secundário
            </button>
            <button
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: `hsl(${colors.color_tertiary})`,
                color: "hsl(0 0% 100%)",
              }}
            >
              Botão Destaque
            </button>
          </div>
          <div className="mt-4 flex gap-2 items-center">
            <span
              className="text-sm font-medium"
              style={{ color: `hsl(${colors.color_tertiary})` }}
            >
              Link de exemplo
            </span>
            <span className="text-sm" style={{ color: darkMode ? "hsl(220 10% 60%)" : "hsl(220 10% 40%)" }}>
              Texto secundário
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
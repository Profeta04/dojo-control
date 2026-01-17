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
import { Palette, Loader2, RotateCcw } from "lucide-react";

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

      let r = 0,
        g = 0,
        b = 0;
      if (h >= 0 && h < 60) {
        r = c;
        g = x;
        b = 0;
      } else if (h >= 60 && h < 120) {
        r = x;
        g = c;
        b = 0;
      } else if (h >= 120 && h < 180) {
        r = 0;
        g = c;
        b = x;
      } else if (h >= 180 && h < 240) {
        r = 0;
        g = x;
        b = c;
      } else if (h >= 240 && h < 300) {
        r = x;
        g = 0;
        b = c;
      } else {
        r = c;
        g = 0;
        b = x;
      }

      const toHex = (n: number) =>
        Math.round((n + m) * 255)
          .toString(16)
          .padStart(2, "0");
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
      let h = 0,
        s = 0;
      const l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r:
            h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
            break;
          case g:
            h = ((b - r) / d + 2) / 6;
            break;
          case b:
            h = ((r - g) / d + 4) / 6;
            break;
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

const DEFAULT_COLORS = {
  color_primary: "0 0% 8%",
  color_secondary: "40 10% 92%",
  color_background: "40 20% 97%",
  color_foreground: "0 0% 10%",
  color_accent: "4 85% 50%",
  color_muted: "40 10% 92%",
  color_primary_foreground: "0 0% 98%",
  color_secondary_foreground: "0 0% 10%",
  color_accent_foreground: "0 0% 100%",
};

export function DojoThemeSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentDojoId, setCurrentDojoId, userDojos, isLoadingDojos } = useDojoContext();

  const dojoId = currentDojoId ?? (userDojos.length === 1 ? userDojos[0].id : null);
  const dojoName = dojoId ? userDojos.find((d) => d.id === dojoId)?.name : undefined;

  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [hasChanges, setHasChanges] = useState(false);

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
        .select(
          "color_primary, color_secondary, color_background, color_foreground, color_accent, color_muted, color_primary_foreground, color_secondary_foreground, color_accent_foreground"
        )
        .eq("id", dojoId)
        .single();

      if (data) {
        setColors({
          color_primary: data.color_primary || DEFAULT_COLORS.color_primary,
          color_secondary: data.color_secondary || DEFAULT_COLORS.color_secondary,
          color_background: data.color_background || DEFAULT_COLORS.color_background,
          color_foreground: data.color_foreground || DEFAULT_COLORS.color_foreground,
          color_accent: data.color_accent || DEFAULT_COLORS.color_accent,
          color_muted: data.color_muted || DEFAULT_COLORS.color_muted,
          color_primary_foreground: data.color_primary_foreground || DEFAULT_COLORS.color_primary_foreground,
          color_secondary_foreground: data.color_secondary_foreground || DEFAULT_COLORS.color_secondary_foreground,
          color_accent_foreground: data.color_accent_foreground || DEFAULT_COLORS.color_accent_foreground,
        });
        setHasChanges(false);
      }
    };

    fetchColors();
  }, [dojoId]);

  const updateColorsMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("Você precisa estar logado para alterar as cores");
      }
      if (!dojoId) {
        throw new Error("Selecione um dojo para alterar as cores");
      }

      const { error } = await supabase
        .from("dojos")
        .update({
          color_primary: colors.color_primary,
          color_secondary: colors.color_secondary,
          color_background: colors.color_background,
          color_foreground: colors.color_foreground,
          color_accent: colors.color_accent,
          color_muted: colors.color_muted,
          color_primary_foreground: colors.color_primary_foreground,
          color_secondary_foreground: colors.color_secondary_foreground,
          color_accent_foreground: colors.color_accent_foreground,
        })
        .eq("id", dojoId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Cores atualizadas com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["dojo-theme"] });
      setHasChanges(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar cores",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleColorChange = (key: keyof typeof colors, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleReset = () => {
    setColors(DEFAULT_COLORS);
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
                <p className="text-xs text-muted-foreground">
                  Dica: para editar o tema, escolha um dojo específico (não "Todos").
                </p>
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
              : "Customize as cores do tema para refletir a identidade visual do seu dojo"}
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
        {/* Background & Text Colors */}
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-4">Cores de Fundo e Texto</h4>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <ColorPicker
              label="Cor de Fundo"
              value={colors.color_background}
              onChange={(v) => handleColorChange("color_background", v)}
              description="Fundo geral das páginas"
            />
            <ColorPicker
              label="Cor do Texto"
              value={colors.color_foreground}
              onChange={(v) => handleColorChange("color_foreground", v)}
              description="Cor principal dos textos"
            />
            <ColorPicker
              label="Cor Suave"
              value={colors.color_muted}
              onChange={(v) => handleColorChange("color_muted", v)}
              description="Usada em fundos suaves"
            />
          </div>
        </div>

        {/* Button Colors */}
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-4">Cores dos Botões</h4>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <ColorPicker
              label="Botão Primário (Fundo)"
              value={colors.color_primary}
              onChange={(v) => handleColorChange("color_primary", v)}
              description="Cor de fundo do botão principal"
            />
            <ColorPicker
              label="Botão Primário (Texto)"
              value={colors.color_primary_foreground}
              onChange={(v) => handleColorChange("color_primary_foreground", v)}
              description="Cor do texto do botão principal"
            />
            <ColorPicker
              label="Botão Secundário (Fundo)"
              value={colors.color_secondary}
              onChange={(v) => handleColorChange("color_secondary", v)}
              description="Cor de fundo do botão secundário"
            />
            <ColorPicker
              label="Botão Secundário (Texto)"
              value={colors.color_secondary_foreground}
              onChange={(v) => handleColorChange("color_secondary_foreground", v)}
              description="Cor do texto do botão secundário"
            />
            <ColorPicker
              label="Botão Destaque (Fundo)"
              value={colors.color_accent}
              onChange={(v) => handleColorChange("color_accent", v)}
              description="Cor de fundo do botão de destaque"
            />
            <ColorPicker
              label="Botão Destaque (Texto)"
              value={colors.color_accent_foreground}
              onChange={(v) => handleColorChange("color_accent_foreground", v)}
              description="Cor do texto do botão de destaque"
            />
          </div>
        </div>

        {/* Preview */}
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: `hsl(${colors.color_background})`,
            color: `hsl(${colors.color_foreground})`,
          }}
        >
          <h4 className="font-semibold mb-2">Pré-visualização</h4>
          <div className="flex flex-wrap gap-2">
            <button
              className="px-4 py-2 rounded-md text-sm font-medium"
              style={{
                backgroundColor: `hsl(${colors.color_primary})`,
                color: `hsl(${colors.color_primary_foreground})`,
              }}
            >
              Botão Primário
            </button>
            <button
              className="px-4 py-2 rounded-md text-sm font-medium"
              style={{
                backgroundColor: `hsl(${colors.color_secondary})`,
                color: `hsl(${colors.color_secondary_foreground})`,
              }}
            >
              Botão Secundário
            </button>
            <button
              className="px-4 py-2 rounded-md text-sm font-medium"
              style={{
                backgroundColor: `hsl(${colors.color_accent})`,
                color: `hsl(${colors.color_accent_foreground})`,
              }}
            >
              Botão Destaque
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


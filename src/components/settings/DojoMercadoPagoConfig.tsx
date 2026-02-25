import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Save, Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";

interface Props {
  dojoId: string;
  dojoName: string;
}

export function DojoMercadoPagoConfig({ dojoId, dojoName }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [accessToken, setAccessToken] = useState("");
  const [isEnabled, setIsEnabled] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);

  // Check if feature is globally enabled
  const { data: globalEnabled } = useQuery({
    queryKey: ["setting", "mercadopago_enabled"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "mercadopago_enabled")
        .single();
      if (error) throw error;
      return data?.value === "true";
    },
  });

  // Get current integration
  const { data: integration, isLoading } = useQuery({
    queryKey: ["dojo-integration", dojoId, "mercadopago"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dojo_integrations")
        .select("*")
        .eq("dojo_id", dojoId)
        .eq("integration_type", "mercadopago")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!dojoId && !!globalEnabled,
  });

  useEffect(() => {
    if (integration) {
      setAccessToken(integration.access_token || "");
      setIsEnabled(integration.is_enabled);
    }
  }, [integration]);

  if (!globalEnabled) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      if (integration) {
        const { error } = await supabase
          .from("dojo_integrations")
          .update({
            access_token: accessToken || null,
            is_enabled: isEnabled,
          })
          .eq("id", integration.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("dojo_integrations")
          .insert({
            dojo_id: dojoId,
            integration_type: "mercadopago",
            access_token: accessToken || null,
            is_enabled: isEnabled,
          });
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["dojo-integration", dojoId] });
      toast({ title: "Integração Mercado Pago salva!" });
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Mercado Pago (PIX Automático)
        </CardTitle>
        <CardDescription>
          Configure o Access Token do Mercado Pago para gerar cobranças PIX automáticas para os alunos de {dojoName}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Switch
            id={`mp-enabled-${dojoId}`}
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
            disabled={isLoading}
          />
          <Label htmlFor={`mp-enabled-${dojoId}`}>
            {isEnabled ? "Ativo" : "Inativo"}
          </Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`mp-token-${dojoId}`}>Access Token</Label>
          <div className="relative">
            <Input
              id={`mp-token-${dojoId}`}
              type={showToken ? "text" : "password"}
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="APP_USR-..."
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full w-10"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Obtenha seu Access Token em{" "}
              <a
                href="https://www.mercadopago.com.br/developers/panel/app"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-primary"
              >
                Mercado Pago Developers
              </a>
              {" "}→ Suas integrações → Credenciais de produção.
            </span>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {saving ? "Salvando..." : "Salvar Integração"}
        </Button>
      </CardContent>
    </Card>
  );
}

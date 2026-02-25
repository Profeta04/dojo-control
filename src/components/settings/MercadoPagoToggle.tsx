import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CreditCard } from "lucide-react";

export function MercadoPagoToggle() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: isEnabled, isLoading } = useQuery({
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

  const handleToggle = async (checked: boolean) => {
    const { error } = await supabase
      .from("settings")
      .update({ value: checked ? "true" : "false" })
      .eq("key", "mercadopago_enabled");

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }

    queryClient.setQueryData(["setting", "mercadopago_enabled"], checked);
    queryClient.invalidateQueries({ queryKey: ["dojo-settings"] });
    toast({ title: checked ? "Mercado Pago habilitado" : "Mercado Pago desabilitado" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Integração Mercado Pago (PIX)
        </CardTitle>
        <CardDescription>
          Quando ativado, os dojos poderão configurar suas próprias credenciais do Mercado Pago para gerar cobranças PIX automáticas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Switch
            id="mp-toggle"
            checked={isEnabled || false}
            onCheckedChange={handleToggle}
            disabled={isLoading}
          />
          <Label htmlFor="mp-toggle">
            {isEnabled ? "Habilitado" : "Desabilitado"}
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}

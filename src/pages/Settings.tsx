import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, MessageSquare, Save, Loader2, Building2, Palette } from "lucide-react";
import { DojoManagement } from "@/components/settings/DojoManagement";
import { DojoThemeSettings } from "@/components/settings/DojoThemeSettings";

interface Setting {
  id: string;
  key: string;
  value: string | null;
  description: string | null;
}

export default function Settings() {
  const navigate = useNavigate();
  const { user, isAdmin, isSuperAdmin, isDono, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const canAccessSettings = isAdmin || isSuperAdmin || isDono;

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .order("key");

      if (error) throw error;
      return data as Setting[];
    },
    enabled: !!user && canAccessSettings,
  });

  useEffect(() => {
    if (settings) {
      const initialData: Record<string, string> = {};
      settings.forEach((setting) => {
        initialData[setting.key] = setting.value || "";
      });
      setFormData(initialData);
      setHasChanges(false);
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Record<string, string>) => {
      const promises = Object.entries(updates).map(([key, value]) =>
        supabase
          .from("settings")
          .update({ value })
          .eq("key", key)
      );
      
      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error("Erro ao atualizar algumas configurações");
      }
    },
    onSuccess: () => {
      toast({
        title: "Configurações salvas!",
        description: "As configurações foram atualizadas com sucesso.",
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar configurações",
        variant: "destructive",
      });
    },
  });

  // Redirect if not authorized
  if (!authLoading && !canAccessSettings) {
    navigate("/dashboard");
    return null;
  }

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettingsMutation.mutate(formData);
  };

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  // Determine default tab and column count based on role
  const getTabConfig = () => {
    if (isSuperAdmin) {
      return { defaultTab: "dojos", columns: 4 };
    }
    return { defaultTab: "messages", columns: 3 };
  };

  const { defaultTab, columns } = getTabConfig();

  return (
    <DashboardLayout>
      <PageHeader
        title="Configurações"
        description="Personalize as configurações do sistema"
      />

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className={`grid w-full gap-1 ${columns === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
          {isSuperAdmin && (
            <TabsTrigger value="dojos" className="gap-1.5 text-xs sm:text-sm">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Dojos</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="messages" className="gap-1.5 text-xs sm:text-sm">
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Mensagens</span>
          </TabsTrigger>
          <TabsTrigger value="theme" className="gap-1.5 text-xs sm:text-sm">
            <Palette className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Tema</span>
          </TabsTrigger>
          <TabsTrigger value="payment" className="gap-1.5 text-xs sm:text-sm">
            <CreditCard className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Pagamento</span>
          </TabsTrigger>
        </TabsList>

        {/* Dojos Management - Super Admin Only */}
        {isSuperAdmin && (
          <TabsContent value="dojos" className="space-y-6">
            <DojoManagement />
          </TabsContent>
        )}

        {/* Messages Settings */}
        <TabsContent value="messages" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" aria-hidden="true" />
                  Mensagens do Sistema
                </CardTitle>
                <CardDescription>
                  Personalize as mensagens exibidas no sistema
                </CardDescription>
              </div>
              <Button 
                onClick={handleSave} 
                disabled={!hasChanges || updateSettingsMutation.isPending}
                size="sm"
              >
                {updateSettingsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="welcome_message">Mensagem de Boas-vindas</Label>
                <Textarea
                  id="welcome_message"
                  value={formData.welcome_message || ""}
                  onChange={(e) => handleChange("welcome_message", e.target.value)}
                  placeholder="Mensagem exibida no dashboard para os usuários"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Esta mensagem será exibida na página inicial do dashboard.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Theme Settings */}
        <TabsContent value="theme" className="space-y-6">
          <DojoThemeSettings />
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payment" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" aria-hidden="true" />
                  Configurações de Pagamento
                </CardTitle>
                <CardDescription>
                  Defina os valores e informações de pagamento
                </CardDescription>
              </div>
              <Button 
                onClick={handleSave} 
                disabled={!hasChanges || updateSettingsMutation.isPending}
                size="sm"
              >
                {updateSettingsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="monthly_fee">Valor da Mensalidade (R$)</Label>
                  <Input
                    id="monthly_fee"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.monthly_fee || ""}
                    onChange={(e) => handleChange("monthly_fee", e.target.value)}
                    placeholder="150.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_due_day">Dia de Vencimento</Label>
                  <Input
                    id="payment_due_day"
                    type="number"
                    min="1"
                    max="28"
                    value={formData.payment_due_day || ""}
                    onChange={(e) => handleChange("payment_due_day", e.target.value)}
                    placeholder="10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pix_key">Chave Pix</Label>
                  <Input
                    id="pix_key"
                    value={formData.pix_key || ""}
                    onChange={(e) => handleChange("pix_key", e.target.value)}
                    placeholder="email@exemplo.com ou CPF/CNPJ"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save indicator */}
      {hasChanges && (
        <div className="fixed bottom-4 right-4 z-50">
          <Card className="bg-accent text-accent-foreground shadow-lg">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <span className="text-sm font-medium">Alterações não salvas</span>
              <Button 
                size="sm" 
                variant="secondary"
                onClick={handleSave}
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Salvar"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}

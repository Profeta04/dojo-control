import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { AvatarUpload } from "@/components/student/AvatarUpload";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { toast } from "sonner";
import { Save, User, Sun, Moon, PanelLeft, PanelBottom, Shield, ShieldOff, LogOut, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { SenseiDojoEdit } from "@/components/settings/SenseiDojoEdit";
import { DojoThemeSettings } from "@/components/settings/DojoThemeSettings";

export default function StudentConfig() {
  const { profile, user, signOut, isAdmin, isSensei, isStudent, canManageStudents } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState(profile?.phone || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [name, setName] = useState(profile?.name || "");

  // Dark mode
  const { data: isDarkMode = false } = useQuery({
    queryKey: ["user-dark-mode", profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return false;
      const { data } = await supabase
        .from("profiles")
        .select("dark_mode")
        .eq("user_id", profile.user_id)
        .maybeSingle();
      return data?.dark_mode ?? false;
    },
    enabled: !!profile?.user_id,
    staleTime: 10 * 60 * 1000,
  });

  // Nav preference
  const { data: navMode = "bottom" } = useQuery({
    queryKey: ["student-nav-mode", profile?.user_id],
    queryFn: () => {
      const stored = localStorage.getItem(`nav-mode-${profile?.user_id}`);
      return (stored as "bottom" | "sidebar") || "bottom";
    },
    enabled: !!profile?.user_id,
  });

  const toggleDarkMode = async () => {
    if (!profile) return;
    const newValue = !isDarkMode;
    queryClient.setQueryData(["user-dark-mode", profile.user_id], newValue);
    const { error } = await supabase
      .from("profiles")
      .update({ dark_mode: newValue })
      .eq("user_id", profile.user_id);
    if (error) {
      queryClient.setQueryData(["user-dark-mode", profile.user_id], isDarkMode);
      toast.error("Erro ao alterar tema");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["user-dark-mode"] });
    queryClient.invalidateQueries({ queryKey: ["dojo-theme"] });
  };

  const setNavMode = (mode: "bottom" | "sidebar") => {
    if (!profile) return;
    localStorage.setItem(`nav-mode-${profile.user_id}`, mode);
    queryClient.setQueryData(["student-nav-mode", profile.user_id], mode);
    // Force reload to apply layout change
    window.location.reload();
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ name, phone, email })
        .eq("user_id", user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["auth-profile"] });
      toast.success("Perfil atualizado!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const roleLabel = isAdmin ? "Admin" : isSensei ? "Sensei" : "Aluno";
  const isFederated = (profile as any)?.is_federated ?? false;

  return (
    <DashboardLayout>
      <PageHeader title="Configurações" description="Gerencie seu perfil e preferências" />

      <div className="space-y-6 max-w-lg mx-auto">
        {/* Avatar & Belt */}
        <Card data-tour="config-avatar">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" /> Foto e Faixa
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <AvatarUpload />
            {profile?.belt_grade && (
              <BeltBadge grade={profile.belt_grade as any} size="lg" />
            )}
            <Badge variant={isFederated ? "default" : "secondary"} className="flex items-center gap-1">
              {isFederated ? <><Shield className="h-3 w-3" /> Federado</> : <><ShieldOff className="h-3 w-3" /> Não federado</>}
            </Badge>
          </CardContent>
        </Card>

        {/* Personal Info */}
        <Card data-tour="config-personal">
          <CardHeader>
            <CardTitle className="text-base">Dados Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Email
              </Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> Telefone
              </Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card data-tour="config-preferences">
          <CardHeader>
            <CardTitle className="text-base">Preferências</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Dark Mode */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isDarkMode ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-muted-foreground" />}
                <div>
                  <p className="text-sm font-medium">Modo Escuro</p>
                  <p className="text-xs text-muted-foreground">{isDarkMode ? "Ativado" : "Desativado"}</p>
                </div>
              </div>
              <Switch checked={isDarkMode} onCheckedChange={toggleDarkMode} />
            </div>

            <Separator />

            {/* Nav Mode */}
            <div>
              <p className="text-sm font-medium mb-3">Navegação Mobile</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setNavMode("bottom")}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
                    navMode === "bottom"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <PanelBottom className={cn("h-8 w-8", navMode === "bottom" ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-xs font-medium", navMode === "bottom" ? "text-primary" : "text-muted-foreground")}>
                    Barra inferior
                  </span>
                </button>
                <button
                  onClick={() => setNavMode("sidebar")}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
                    navMode === "sidebar"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <PanelLeft className={cn("h-8 w-8", navMode === "sidebar" ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-xs font-medium", navMode === "sidebar" ? "text-primary" : "text-muted-foreground")}>
                    Menu lateral
                  </span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dojo Config for Sensei */}
        {isSensei && (
          <>
            <Separator className="my-2" />
            <PageHeader title="Configurações do Dojo" description="Informações e logo do dojo" />
            <SenseiDojoEdit />
            <Separator className="my-2" />
            <PageHeader title="Tema do Dojo" description="Personalize as cores do dojo" />
            <DojoThemeSettings />
          </>
        )}

        {/* Sign Out */}
        <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sair da conta
        </Button>
      </div>
    </DashboardLayout>
  );
}

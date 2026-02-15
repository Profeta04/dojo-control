import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Palette, Sparkles } from "lucide-react";
import { DojoManagement } from "@/components/settings/DojoManagement";
import { DojoThemeSettings } from "@/components/settings/DojoThemeSettings";
import { SeasonsManagement } from "@/components/settings/SeasonsManagement";

export default function Settings() {
  const navigate = useNavigate();
  const { isAdmin, isDono, isSensei, loading: authLoading } = useAuth();

  // Admin has full access, Sensei can only access theme
  const canAccessSettings = isAdmin || isDono || isSensei;
  const canManageDojos = isAdmin;

  // Redirect if not authorized
  if (!authLoading && !canAccessSettings) {
    navigate("/dashboard");
    return null;
  }

  if (authLoading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  // Sensei can only see theme settings
  if (isSensei && !isAdmin && !isDono) {
    return (
      <RequireApproval>
      <DashboardLayout>
        <PageHeader
          title="Configurações"
          description="Personalize o tema do sistema"
        />
        <div className="mt-6">
          <DojoThemeSettings />
        </div>
      </DashboardLayout>
      </RequireApproval>
    );
  }

  return (
    <RequireApproval>
    <DashboardLayout>
      <PageHeader
        title="Configurações"
        description="Personalize as configurações do sistema"
      />

      <Tabs defaultValue="dojos" className="mt-6 space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="dojos" className="gap-2">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            Dojos
          </TabsTrigger>
          <TabsTrigger value="theme" className="gap-2">
            <Palette className="h-4 w-4" aria-hidden="true" />
            Tema
          </TabsTrigger>
          <TabsTrigger value="seasons" className="gap-2">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Temporadas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dojos" className="space-y-6">
          <DojoManagement />
        </TabsContent>

        <TabsContent value="theme" className="space-y-6">
          <DojoThemeSettings />
        </TabsContent>

        <TabsContent value="seasons" className="space-y-6">
          <SeasonsManagement />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
    </RequireApproval>
  );
}

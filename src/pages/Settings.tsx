import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Palette } from "lucide-react";
import { DojoManagement } from "@/components/settings/DojoManagement";
import { DojoThemeSettings } from "@/components/settings/DojoThemeSettings";
import { SenseiDojoEdit } from "@/components/settings/SenseiDojoEdit";

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin, isSensei, loading: authLoading } = useAuth();

  const canAccessSettings = isAdmin || isSensei;
  const defaultTab = searchParams.get("tab") || "dojos";

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

  const isSenseiOnly = isSensei && !isAdmin;

  if (isSenseiOnly) {
    return (
      <RequireApproval>
        <DashboardLayout>
          <PageHeader
            title="Dojo"
            description="Gerencie as informações e o tema do dojo"
          />
          <Tabs defaultValue={defaultTab} className="mt-6 space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-sm">
              <TabsTrigger value="dojos" className="gap-2">
                <Building2 className="h-4 w-4" aria-hidden="true" />
                Informações
              </TabsTrigger>
              <TabsTrigger value="theme" className="gap-2">
                <Palette className="h-4 w-4" aria-hidden="true" />
                Tema
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dojos" className="space-y-6">
              <SenseiDojoEdit />
            </TabsContent>
            <TabsContent value="theme" className="space-y-6">
              <DojoThemeSettings />
            </TabsContent>
          </Tabs>
        </DashboardLayout>
      </RequireApproval>
    );
  }

  return (
    <RequireApproval>
      <DashboardLayout>
        <PageHeader
          title="Dojo"
          description="Gerencie as configurações do sistema"
        />

        <Tabs defaultValue={defaultTab} className="mt-6 space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-sm">
            <TabsTrigger value="dojos" className="gap-2">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              Dojos
            </TabsTrigger>
            <TabsTrigger value="theme" className="gap-2">
              <Palette className="h-4 w-4" aria-hidden="true" />
              Tema
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dojos" className="space-y-6">
            <DojoManagement />
          </TabsContent>
          <TabsContent value="theme" className="space-y-6">
            <DojoThemeSettings />
          </TabsContent>
        </Tabs>
      </DashboardLayout>
    </RequireApproval>
  );
}

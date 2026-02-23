import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { AttendanceTab } from "@/components/classes/AttendanceTab";
import { DojoQRCode } from "@/components/settings/DojoQRCode";
import { useDojoContext } from "@/hooks/useDojoContext";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, QrCode } from "lucide-react";
import { FeatureGate } from "@/components/shared/FeatureGate";

export default function Attendance() {
  const { loading: authLoading, canManageStudents } = useAuth();
  const { currentDojoId, userDojos } = useDojoContext();
  const { getSignedUrl } = useSignedUrl();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const currentDojo = userDojos.find(d => d.id === currentDojoId) || userDojos[0];

  useEffect(() => {
    const loadLogo = async () => {
      if (currentDojo?.logo_url) {
        if (currentDojo.logo_url.startsWith('http')) {
          setLogoUrl(currentDojo.logo_url);
        } else {
          const signed = await getSignedUrl('dojo-logos', currentDojo.logo_url);
          if (signed) {
            setLogoUrl(signed);
          } else {
            const { data } = supabase.storage.from('dojo-logos').getPublicUrl(currentDojo.logo_url);
            setLogoUrl(data?.publicUrl || null);
          }
        }
      } else {
        setLogoUrl(null);
      }
    };
    loadLogo();
  }, [currentDojo?.logo_url, getSignedUrl]);

  if (authLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  return (
    <RequireApproval>
      <DashboardLayout>
        <PageHeader title="Presenças" description="Gerencie presenças e check-in automático" />

        <Tabs defaultValue="manual" className="mt-4 sm:mt-6">
          <TabsList className="w-full grid grid-cols-2 max-w-sm">
            <TabsTrigger value="manual" className="gap-1.5 text-xs sm:text-sm">
              <ClipboardCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Chamada</span>
            </TabsTrigger>
            <TabsTrigger value="qrcode" className="gap-1.5 text-xs sm:text-sm">
              <QrCode className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>QR Code</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="mt-4">
            <AttendanceTab />
          </TabsContent>

          <TabsContent value="qrcode" className="mt-4" data-tour="attendance-qrcode">
            <FeatureGate feature="qr_checkin">
              {currentDojo ? (
                <DojoQRCode
                  dojoId={currentDojo.id}
                  dojoName={currentDojo.name}
                  checkinToken={currentDojo.checkin_token}
                  logoUrl={logoUrl}
                  colorPrimary={currentDojo.color_primary}
                  colorAccent={currentDojo.color_accent}
                />
              ) : (
                <p className="text-muted-foreground text-sm">Nenhum dojo selecionado.</p>
              )}
            </FeatureGate>
          </TabsContent>
        </Tabs>
      </DashboardLayout>
    </RequireApproval>
  );
}

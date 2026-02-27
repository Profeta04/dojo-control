import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { StudentProfileCard } from "@/components/student/StudentProfileCard";
import { AttendanceStatsCard } from "@/components/student/AttendanceStatsCard";
import { GraduationTimeline } from "@/components/student/GraduationTimeline";
import { GuardianInfoCard } from "@/components/student/GuardianInfoCard";
import { UpcomingTrainingsCard } from "@/components/student/UpcomingTrainingsCard";
import { StudentXPCard } from "@/components/student/StudentXPCard";
import { GuardianDashboard } from "@/components/guardian/GuardianDashboard";
import { useGuardianMinors } from "@/hooks/useGuardianMinors";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Users } from "lucide-react";

export default function StudentProfile() {
  const { loading: authLoading } = useAuth();
  const { hasMinors } = useGuardianMinors();

  if (authLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  const profileContent = (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <StudentProfileCard />
        <GuardianInfoCard />
        <GraduationTimeline />
      </div>
      <div className="space-y-6">
        <UpcomingTrainingsCard />
        <AttendanceStatsCard />
        <StudentXPCard />
      </div>
    </div>
  );

  return (
    <RequireApproval>
      <DashboardLayout>
        <PageHeader 
          title="Dashboard" 
          description="Seus dados, frequência e evolução no judô" 
        />
        <div className="mt-6">
          {hasMinors ? (
            <Tabs defaultValue="meus-dados" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="meus-dados" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Meus Dados
                </TabsTrigger>
                <TabsTrigger value="dependentes" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Dependentes
                </TabsTrigger>
              </TabsList>
              <TabsContent value="meus-dados">
                {profileContent}
              </TabsContent>
              <TabsContent value="dependentes">
                <GuardianDashboard />
              </TabsContent>
            </Tabs>
          ) : (
            profileContent
          )}
        </div>
      </DashboardLayout>
    </RequireApproval>
  );
}

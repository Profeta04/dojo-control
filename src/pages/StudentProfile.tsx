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

export default function StudentProfile() {
  const { loading: authLoading } = useAuth();

  if (authLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  return (
    <RequireApproval>
      <DashboardLayout>
        <PageHeader 
          title="Meus Dados" 
          description="Seus dados, frequência e evolução no judô" 
        />
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      </DashboardLayout>
    </RequireApproval>
  );
}

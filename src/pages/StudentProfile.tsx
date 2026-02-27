import { useAuth } from "@/hooks/useAuth";
import { useGuardianMinors } from "@/hooks/useGuardianMinors";
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
import { GuardianProfileCard, GuardianMinorsSummaryCard } from "@/components/guardian/GuardianProfileCard";
import { GuardianPaymentsSummaryCard } from "@/components/guardian/GuardianPaymentsSummaryCard";

export default function StudentProfile() {
  const { loading: authLoading, isStudent, canManageStudents } = useAuth();
  const { hasMinors } = useGuardianMinors();
  const isGuardian = isStudent && !canManageStudents && hasMinors;

  if (authLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  if (isGuardian) {
    return (
      <RequireApproval>
        <DashboardLayout>
          <PageHeader 
            title="Meus Dados" 
            description="Suas informações pessoais e dependentes" 
          />
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GuardianProfileCard />
            <GuardianMinorsSummaryCard />
            <GuardianPaymentsSummaryCard />
          </div>
        </DashboardLayout>
      </RequireApproval>
    );
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

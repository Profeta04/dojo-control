import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { StudentProfileCard } from "@/components/student/StudentProfileCard";
import { GuardianDashboard } from "@/components/guardian/GuardianDashboard";
import { useGuardianMinors } from "@/hooks/useGuardianMinors";

export default function StudentProfile() {
  const { loading: authLoading } = useAuth();
  const { hasMinors } = useGuardianMinors();

  if (authLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  return (
    <RequireApproval>
      <DashboardLayout>
        <PageHeader 
          title="Meu Perfil" 
          description="Veja seus dados e graduação" 
        />
        <div className="mt-6 space-y-6">
          <StudentProfileCard />
          {hasMinors && <GuardianDashboard />}
        </div>
      </DashboardLayout>
    </RequireApproval>
  );
}

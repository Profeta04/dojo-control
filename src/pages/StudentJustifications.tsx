import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { StudentJustificationForm } from "@/components/justifications/StudentJustificationForm";

export default function StudentJustifications() {
  const { loading: authLoading } = useAuth();

  if (authLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  return (
    <RequireApproval>
      <DashboardLayout>
        <PageHeader
          title="Justificativa de Faltas"
          description="Justifique suas ausências em até 7 dias"
        />
        <div className="mt-4">
          <StudentJustificationForm />
        </div>
      </DashboardLayout>
    </RequireApproval>
  );
}

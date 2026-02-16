import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { AttendanceTab } from "@/components/classes/AttendanceTab";

export default function Attendance() {
  const { loading: authLoading } = useAuth();

  if (authLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  return (
    <RequireApproval>
      <DashboardLayout>
        <PageHeader title="Presenças" description="Gerencie presenças e check-in automático" />
        <div className="mt-4 sm:mt-6">
          <AttendanceTab />
        </div>
      </DashboardLayout>
    </RequireApproval>
  );
}

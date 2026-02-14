import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { StudentTasksDashboard } from "@/components/tasks/StudentTasksDashboard";

export default function StudentTasks() {
  const { loading: authLoading } = useAuth();

  if (authLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  return (
    <RequireApproval>
      <DashboardLayout>
        <PageHeader 
          title="Minhas Tarefas" 
          description="Acompanhe suas atividades e evolução" 
        />
        <div className="mt-6">
          <StudentTasksDashboard />
        </div>
      </DashboardLayout>
    </RequireApproval>
  );
}

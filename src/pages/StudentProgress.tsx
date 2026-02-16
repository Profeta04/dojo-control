import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { TasksManagement } from "@/components/tasks/TasksManagement";

export default function StudentProgress() {
  const { loading: authLoading } = useAuth();

  if (authLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Progresso dos Alunos"
        description="Acompanhe o desempenho dos alunos nas questões"
      />
      <div className="mt-4">
        <TasksManagement />
      </div>
    </DashboardLayout>
  );
}

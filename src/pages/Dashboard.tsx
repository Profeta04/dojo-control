import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useGuardianMinors } from "@/hooks/useGuardianMinors";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { ExportReportButton } from "@/components/dashboard/ExportReportButton";
import { GuardianDashboard } from "@/components/guardian/GuardianDashboard";
import { StudentTasksDashboard } from "@/components/tasks/StudentTasksDashboard";
import { TasksManagement } from "@/components/tasks/TasksManagement";
import { AlertCircle } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading, profile, isAdmin, isStudent, canManageStudents } = useAuth();
  const { hasMinors } = useGuardianMinors();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  const isPending = profile?.registration_status === "pendente";

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <PageHeader
          title={`Olá, ${profile?.name?.split(" ")[0] || "Judoca"}! 🥋`}
          description="Bem-vindo ao sistema de gestão do dojo"
        />
        {canManageStudents && <ExportReportButton />}
      </div>

      {/* Pending Approval Warning */}
      {isPending && (
        <div className="mb-6 p-4 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
          <div>
            <p className="font-medium text-foreground">Cadastro pendente de aprovação</p>
            <p className="text-sm text-muted-foreground">
              Seu cadastro está sendo analisado. Aguarde a confirmação de um Sensei para ter acesso completo ao sistema.
            </p>
          </div>
        </div>
      )}

      {/* Guardian Dashboard - Shows if user has linked minors */}
      {hasMinors && (
        <div className="mb-6">
          <GuardianDashboard />
        </div>
      )}

      {/* Dashboard Stats Component */}
      <DashboardStats isAdmin={isAdmin} canManageStudents={canManageStudents} />

      {/* Tasks Section */}
      <div className="mt-8">
        {isStudent && !canManageStudents ? (
          <StudentTasksDashboard />
        ) : canManageStudents ? (
          <TasksManagement />
        ) : null}
      </div>

      {!isPending && (
        <div className="mt-8 p-6 bg-card rounded-lg border border-border">
          <h2 className="text-lg font-semibold mb-2">🎯 Próximos passos</h2>
          <p className="text-muted-foreground">
            {canManageStudents 
              ? "Use o menu lateral para gerenciar alunos, turmas, presenças e pagamentos."
              : "Explore o menu para ver suas turmas, agenda e histórico de graduações."}
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}

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
import { PendingApprovalScreen } from "@/components/auth/PendingApprovalScreen";
import { StudentProfileCard } from "@/components/student/StudentProfileCard";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading, profile, isAdmin, isStudent, canManageStudents, isPending } = useAuth();
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

  // Show pending approval screen if user is not approved
  if (isPending) {
    return <PendingApprovalScreen />;
  }

  const isStudentOnly = isStudent && !canManageStudents;

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <PageHeader
            title={`Olá, ${profile?.name?.split(" ")[0] || "Judoca"}! 🥋`}
            description="Bem-vindo ao sistema de gestão do dojo"
          />
          {canManageStudents && <ExportReportButton />}
        </div>
      </div>

      {/* Student Profile Card - Shows for students only */}
      {isStudentOnly && (
        <div className="mb-6">
          <StudentProfileCard />
        </div>
      )}

      {/* Guardian Dashboard - Shows if user has linked minors */}
      {hasMinors && (
        <div className="mb-6">
          <GuardianDashboard />
        </div>
      )}

      {/* Dashboard Stats Component - Only for admins/senseis */}
      {canManageStudents && (
        <DashboardStats isAdmin={isAdmin} canManageStudents={canManageStudents} />
      )}

      {/* Tasks Section */}
      <div className="mt-6">
        {isStudentOnly ? (
          <StudentTasksDashboard />
        ) : canManageStudents ? (
          <TasksManagement />
        ) : null}
      </div>

      <div className="mt-6 p-4 sm:p-6 bg-card rounded-lg border border-border">
        <h2 className="text-base sm:text-lg font-semibold mb-2">🎯 Próximos passos</h2>
        <p className="text-sm text-muted-foreground">
          {canManageStudents 
            ? "Use o menu lateral para gerenciar alunos, turmas, presenças e pagamentos."
            : "Acompanhe suas tarefas e evolução no judô."}
        </p>
      </div>
    </DashboardLayout>
  );
}

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
import { SenseiAnalytics } from "@/components/dashboard/SenseiAnalytics";
import { XPBar } from "@/components/gamification/XPBar";
import { AchievementsPanel } from "@/components/gamification/AchievementsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading, profile, isAdmin, isStudent, canManageStudents, isPending } = useAuth();
  const { hasMinors } = useGuardianMinors();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
    // Students should not access dashboard, redirect to profile
    if (!authLoading && user && isStudent && !canManageStudents) {
      navigate("/perfil", { replace: true });
    }
  }, [user, authLoading, navigate, isStudent, canManageStudents]);

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
        <div className="mb-6 space-y-4">
          <StudentProfileCard />
          <XPBar />
          <AchievementsPanel compact maxVisible={8} />
        </div>
      )}

      {/* Guardian Dashboard - Shows if user has linked minors */}
      {hasMinors && (
        <div className="mb-6">
          <GuardianDashboard />
        </div>
      )}

      {/* Staff Tabbed Content */}
      {canManageStudents && (
        <Tabs defaultValue="dashboard" className="mt-2">
          <TabsList className="grid w-full grid-cols-2 h-11">
            <TabsTrigger value="dashboard" className="flex items-center gap-2 text-sm">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4" />
              Progresso dos Alunos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6 space-y-6">
            <DashboardStats isAdmin={isAdmin} canManageStudents={canManageStudents} />
            <SenseiAnalytics />
            <div className="p-4 sm:p-6 bg-card rounded-xl border border-border/60 shadow-sm">
              <h2 className="text-base sm:text-lg font-bold text-foreground mb-2">Próximos passos</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Use o menu lateral para gerenciar alunos, turmas, presenças e pagamentos.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="progress" className="mt-6">
            <TasksManagement />
          </TabsContent>
        </Tabs>
      )}

      {/* Student Content */}
      {isStudentOnly && (
        <div className="mt-6">
          <StudentTasksDashboard />
        </div>
      )}
    </DashboardLayout>
  );
}

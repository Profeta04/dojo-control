import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { GraduationTimeline } from "@/components/student/GraduationTimeline";
import { AttendanceStatsCard } from "@/components/student/AttendanceStatsCard";
import { StudentXPCard } from "@/components/student/StudentXPCard";

export default function StudentMyProgress() {
  const { profile, loading: authLoading } = useAuth();

  if (authLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  return (
    <RequireApproval>
      <DashboardLayout>
        <PageHeader 
          title="Meu Progresso" 
          description="Acompanhe sua evolução no dojo" 
        />
        
        <div className="mt-4 space-y-6">
          <StudentXPCard />
          <AttendanceStatsCard />
          <GraduationTimeline />
        </div>
      </DashboardLayout>
    </RequireApproval>
  );
}
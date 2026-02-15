import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { StudentProfileCard } from "@/components/student/StudentProfileCard";
import { AttendanceStatsCard } from "@/components/student/AttendanceStatsCard";
import { GraduationTimeline } from "@/components/student/GraduationTimeline";
import { GuardianInfoCard } from "@/components/student/GuardianInfoCard";
import { UpcomingTrainingsCard } from "@/components/student/UpcomingTrainingsCard";
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
          title="Dashboard" 
          description="Seus dados, frequência e evolução no judô" 
        />
        <div className="mt-6 space-y-6">
          {/* 1. Profile card with avatar, belt, federation status */}
          <StudentProfileCard />

          {/* 2. Upcoming trainings - most actionable info first */}
          <UpcomingTrainingsCard />

          {/* 3. Attendance stats */}
          <AttendanceStatsCard />

          {/* 4. Guardian info */}
          <GuardianInfoCard />

          {/* 5. Graduation history */}
          <GraduationTimeline />

          {/* 6. Guardian area (if has minors) */}
          {hasMinors && <GuardianDashboard />}
        </div>
      </DashboardLayout>
    </RequireApproval>
  );
}

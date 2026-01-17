import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, CalendarDays, ClipboardCheck } from "lucide-react";
import { ClassesTab } from "@/components/classes/ClassesTab";
import { ScheduleTab } from "@/components/classes/ScheduleTab";
import { AttendanceTab } from "@/components/classes/AttendanceTab";

export default function Classes() {
  const { canManageStudents, loading: authLoading } = useAuth();

  if (authLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <PageHeader title="Turmas" description="Gerencie turmas, agenda e presenças" />

      <Tabs defaultValue="classes" className="mt-6">
        <TabsList className={`grid w-full ${canManageStudents ? 'grid-cols-3' : 'grid-cols-2'} lg:w-[400px]`}>
          <TabsTrigger value="classes" className="gap-1.5 text-xs sm:text-sm">
            <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Turmas</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-1.5 text-xs sm:text-sm">
            <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Agenda</span>
          </TabsTrigger>
          {canManageStudents && (
            <TabsTrigger value="attendance" className="gap-1.5 text-xs sm:text-sm">
              <ClipboardCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Presenças</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="classes" className="mt-4 sm:mt-6">
          <ClassesTab />
        </TabsContent>

        <TabsContent value="schedule" className="mt-4 sm:mt-6">
          <ScheduleTab />
        </TabsContent>

        {canManageStudents && (
          <TabsContent value="attendance" className="mt-4 sm:mt-6">
            <AttendanceTab />
          </TabsContent>
        )}
      </Tabs>
    </DashboardLayout>
  );
}

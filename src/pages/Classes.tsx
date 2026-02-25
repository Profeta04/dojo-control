import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, CalendarDays } from "lucide-react";
import { ClassesTab } from "@/components/classes/ClassesTab";
import { ScheduleTab } from "@/components/classes/ScheduleTab";

export default function Classes() {
  const { loading: authLoading } = useAuth();

  if (authLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  return (
    <RequireApproval>
      <DashboardLayout>
        <PageHeader title="Turmas" description="Gerencie turmas e agenda" />

        <Tabs defaultValue="classes" className="mt-4 sm:mt-6">
          <TabsList className="w-full grid grid-cols-2 max-w-sm">
            <TabsTrigger value="classes" className="gap-1.5 text-xs sm:text-sm">
              <GraduationCap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Turmas
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-1.5 text-xs sm:text-sm">
              <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Agenda
            </TabsTrigger>
          </TabsList>

          <TabsContent value="classes" className="mt-4">
            <ClassesTab />
          </TabsContent>

          <TabsContent value="schedule" className="mt-4">
            <ScheduleTab />
          </TabsContent>
        </Tabs>
      </DashboardLayout>
    </RequireApproval>
  );
}

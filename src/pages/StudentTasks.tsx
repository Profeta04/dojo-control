import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { StudentTasksDashboard } from "@/components/tasks/StudentTasksDashboard";

import { LeaderboardPanel } from "@/components/gamification/LeaderboardPanel";
import { XPBar } from "@/components/gamification/XPBar";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, ClipboardList } from "lucide-react";

export default function StudentTasks() {
  const { loading: authLoading } = useAuth();

  if (authLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  return (
    <RequireApproval>
      <DashboardLayout>
        <PageHeader
          title="Tarefas"
          description="Complete tarefas, ganhe XP e suba no ranking!" />

        {/* XP Bar */}
        <div className="mt-4 mb-6">
          <XPBar />
        </div>

        {/* Tabbed content */}
        <Tabs defaultValue="missions" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-11">
            <TabsTrigger value="missions" className="flex items-center gap-2 text-sm">
              <ClipboardList className="h-4 w-4" />
              Tarefas
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex items-center gap-2 text-sm">
              <Crown className="h-4 w-4" />
              Ranking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="missions" className="mt-6">
            <StudentTasksDashboard />
          </TabsContent>

          <TabsContent value="ranking" className="mt-6">
            <LeaderboardPanel />
          </TabsContent>
        </Tabs>
      </DashboardLayout>
    </RequireApproval>
  );
}
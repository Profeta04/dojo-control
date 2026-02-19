import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { AchievementsPanel } from "@/components/gamification/AchievementsPanel";
import { LeaderboardPanel } from "@/components/gamification/LeaderboardPanel";
import { XPBar } from "@/components/gamification/XPBar";
import { SeasonBanner } from "@/components/gamification/SeasonBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Crown } from "lucide-react";

export default function StudentAchievements() {
  const { loading: authLoading } = useAuth();

  if (authLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  return (
    <RequireApproval>
      <DashboardLayout>
        <PageHeader 
          title="Conquistas & Ranking" 
          description="Veja suas conquistas e sua posição no ranking!" 
        />
        
        <div className="mt-4">
          <SeasonBanner />
        </div>

        <div className="mt-3 mb-6">
          <XPBar />
        </div>

        <Tabs defaultValue="achievements" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-11">
            <TabsTrigger value="achievements" className="flex items-center gap-2 text-sm">
              <Trophy className="h-4 w-4" />
              Conquistas
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex items-center gap-2 text-sm">
              <Crown className="h-4 w-4" />
              Ranking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="achievements" className="mt-6">
            <AchievementsPanel />
          </TabsContent>

          <TabsContent value="ranking" className="mt-6">
            <LeaderboardPanel />
          </TabsContent>
        </Tabs>
      </DashboardLayout>
    </RequireApproval>
  );
}
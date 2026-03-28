import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { StudentTasksDashboard } from "@/components/tasks/StudentTasksDashboard";
import { LeaderboardPanel } from "@/components/gamification/LeaderboardPanel";
import { XPBar } from "@/components/gamification/XPBar";
import { StudyMaterialsList } from "@/components/studies/StudyMaterialsList";
import { VideoLibrary } from "@/components/studies/VideoLibrary";
import { ExamsList } from "@/components/studies/ExamsList";
import { Crown, ClipboardList, BookOpen, Video, ClipboardCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type StudyTab = "tarefas" | "apostilas" | "simulados" | "videos";

const tabs: { key: StudyTab; label: string; icon: typeof ClipboardList }[] = [
  { key: "tarefas", label: "Tarefas", icon: ClipboardList },
  { key: "apostilas", label: "Apostilas", icon: BookOpen },
  { key: "simulados", label: "Simulados", icon: ClipboardCheck },
  { key: "videos", label: "Vídeos", icon: Video },
];

export default function StudentStudies() {
  const { loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<StudyTab>("tarefas");
  const [showRanking, setShowRanking] = useState(false);

  if (authLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  return (
    <RequireApproval>
      <DashboardLayout>
        <PageHeader
          title="Estudos"
          description="Aprenda, pratique e evolua no Judô!"
        />

        {/* XP Bar */}
        <AnimatePresence>
          {activeTab === "tarefas" && !showRanking && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 16, marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
              transition={{ duration: 0.3 }}
            >
              <XPBar />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab navigation */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-muted/50 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setShowRanking(false); }}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200",
                  activeTab === tab.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.slice(0, 4)}</span>
              </button>
            );
          })}
        </div>

        {/* Ranking toggle within Tarefas */}
        {activeTab === "tarefas" && (
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted/50 mb-6">
            <button
              onClick={() => setShowRanking(false)}
              className={cn(
                "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                !showRanking
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ClipboardList className="h-4 w-4" />
              Missões
            </button>
            <button
              onClick={() => setShowRanking(true)}
              className={cn(
                "flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                showRanking
                  ? "bg-warning/15 text-warning shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Crown className="h-4 w-4" />
              Ranking
            </button>
          </div>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeTab}-${showRanking}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === "tarefas" && !showRanking && <StudentTasksDashboard />}
            {activeTab === "tarefas" && showRanking && <LeaderboardPanel />}
            {activeTab === "apostilas" && <StudyMaterialsList />}
            {activeTab === "simulados" && <ExamsList />}
            {activeTab === "videos" && <VideoLibrary />}
          </motion.div>
        </AnimatePresence>
      </DashboardLayout>
    </RequireApproval>
  );
}

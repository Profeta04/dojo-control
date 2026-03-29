import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Crown, ClipboardList, BookOpen, Video, ClipboardCheck, ArrowLeft, ChevronRight, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type StudyTab = "tarefas" | "apostilas" | "simulados" | "videos";

const tabs: { key: StudyTab; label: string; description: string; icon: typeof ClipboardList; gradient: string }[] = [
  { key: "tarefas", label: "Tarefas", description: "Missões e ranking do dojo", icon: ClipboardList, gradient: "from-primary/20 to-primary/5" },
  { key: "apostilas", label: "Apostilas", description: "Material de estudo por faixa", icon: BookOpen, gradient: "from-blue-500/20 to-blue-500/5" },
  { key: "simulados", label: "Simulados", description: "Provas práticas por faixa", icon: ClipboardCheck, gradient: "from-green-500/20 to-green-500/5" },
  // { key: "videos", label: "Vídeos", description: "Videoaulas e demonstrações", icon: Video, gradient: "from-purple-500/20 to-purple-500/5" },
];

const tabIconColors: Record<StudyTab, string> = {
  tarefas: "bg-primary/15 text-primary",
  apostilas: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  simulados: "bg-green-500/15 text-green-600 dark:text-green-400",
  videos: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
};

export default function StudentStudies() {
  const { loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<StudyTab | null>(null);
  const [showRanking, setShowRanking] = useState(false);

  if (authLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  const handleBack = () => {
    setActiveTab(null);
    setShowRanking(false);
  };

  const currentTab = tabs.find(t => t.key === activeTab);

  return (
    <RequireApproval>
      <DashboardLayout>
        <AnimatePresence mode="wait">
          {activeTab === null ? (
            /* ───── Menu principal ───── */
            <motion.div
              key="menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <PageHeader
                title="Estudos"
                description="Aprenda, pratique e evolua no Judô!"
              />

              <div className="grid gap-3 mt-4">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const iconStyle = tabIconColors[tab.key];
                  return (
                    <button
                      key={tab.key}
                      className={cn(
                        "w-full flex items-center gap-3 p-4 rounded-xl border border-border",
                        "bg-gradient-to-r transition-all active:scale-[0.98]",
                        "hover:shadow-md hover:border-primary/20",
                        tab.gradient
                      )}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      <div className={cn("p-2.5 rounded-xl flex-shrink-0", iconStyle)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-semibold text-sm text-foreground">{tab.label}</p>
                        <p className="text-xs text-muted-foreground">{tab.description}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            /* ───── Conteúdo da sub-aba ───── */
            <motion.div
              key={`content-${activeTab}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header com voltar + título alinhados */}
              <div className="flex items-center gap-3 mb-5">
                <button
                  onClick={handleBack}
                  className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted/50 hover:bg-muted transition-colors flex-shrink-0"
                >
                  <ArrowLeft className="h-4 w-4 text-foreground" />
                </button>
                <div className="flex items-center gap-2">
                  {currentTab && (
                    <div className={cn("p-1.5 rounded-lg", tabIconColors[activeTab])}>
                      <currentTab.icon className="h-4 w-4" />
                    </div>
                  )}
                  <h2 className="font-bold text-lg text-foreground">
                    {currentTab?.label}
                  </h2>
                </div>
              </div>

              {/* XP Bar para tarefas */}
              {activeTab === "tarefas" && !showRanking && (
                <div className="mb-4">
                  <XPBar />
                </div>
              )}

              {/* Ranking toggle dentro de Tarefas */}
              {activeTab === "tarefas" && (
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted/50 mb-4">
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

              {/* Conteúdo */}
              {activeTab === "tarefas" && !showRanking && <StudentTasksDashboard />}
              {activeTab === "tarefas" && showRanking && <LeaderboardPanel />}
              {activeTab === "apostilas" && <StudyMaterialsList />}
              {activeTab === "simulados" && <ExamsList />}
              {activeTab === "videos" && <VideoLibrary />}
            </motion.div>
          )}
        </AnimatePresence>
      </DashboardLayout>
    </RequireApproval>
  );
}

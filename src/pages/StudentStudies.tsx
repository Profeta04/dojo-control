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
import { Crown, ClipboardList, BookOpen, Video, ClipboardCheck, ArrowLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type StudyTab = "tarefas" | "apostilas" | "simulados" | "videos";

const tabs: { key: StudyTab; label: string; description: string; icon: typeof ClipboardList }[] = [
  { key: "tarefas", label: "Tarefas", description: "Missões e ranking do dojo", icon: ClipboardList },
  { key: "apostilas", label: "Apostilas", description: "Material de estudo por faixa", icon: BookOpen },
  { key: "simulados", label: "Simulados", description: "Provas práticas por faixa", icon: ClipboardCheck },
  { key: "videos", label: "Vídeos", description: "Videoaulas e demonstrações", icon: Video },
];

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
                  return (
                    <Card
                      key={tab.key}
                      className="cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                      onClick={() => setActiveTab(tab.key)}
                    >
                      <CardContent className="flex items-center gap-3 py-4 px-4">
                        <div className="p-2.5 rounded-xl bg-primary/10 flex-shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground">{tab.label}</p>
                          <p className="text-xs text-muted-foreground">{tab.description}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </CardContent>
                    </Card>
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
              {/* Botão voltar + título */}
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="gap-1 px-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
                <h2 className="font-semibold text-base text-foreground">
                  {tabs.find(t => t.key === activeTab)?.label}
                </h2>
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

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { useAchievements } from "@/hooks/useAchievements";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Trophy, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";

const RARITY_STYLES: Record<string, { border: string; bg: string; glow: string; label: string }> = {
  common: { border: "border-muted-foreground/30", bg: "bg-muted/50", glow: "", label: "Comum" },
  rare: { border: "border-blue-400/50", bg: "bg-blue-500/10", glow: "shadow-blue-400/10", label: "Rara" },
  epic: { border: "border-purple-400/50", bg: "bg-purple-500/10", glow: "shadow-purple-400/20", label: "Épica" },
  legendary: { border: "border-amber-400/50", bg: "bg-amber-500/10", glow: "shadow-amber-400/30", label: "Lendária" },
};

export default function StudentAchievements() {
  const { loading: authLoading } = useAuth();
  const { allAchievements, unlockedAchievements, unlockedCount, totalCount, progressPercent, isLoading } = useAchievements();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (authLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  const unlockedIds = new Set(unlockedAchievements.map(ua => ua.achievement_id));
  const permanentAchievements = allAchievements.filter(a => !a.is_annual);
  const annualAchievements = unlockedAchievements.filter(ua => ua.achievement?.is_annual);

  return (
    <RequireApproval>
      <DashboardLayout>
        <PageHeader 
          title="Conquistas" 
          description="Desbloqueie conquistas completando tarefas e evoluindo no dojo" 
        />
        
        <div className="mt-4 space-y-5">
          {/* Counter & progress */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-accent" />
                  <span className="font-semibold text-sm">
                    {unlockedCount} de {totalCount} conquistas
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {progressPercent}%
                </Badge>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </CardContent>
          </Card>

          {/* All achievements grid */}
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {permanentAchievements.map((achievement, i) => {
                  const isUnlocked = unlockedIds.has(achievement.id);
                  const style = RARITY_STYLES[achievement.rarity] || RARITY_STYLES.common;
                  const isSelected = selectedId === achievement.id;

                  return (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.03, duration: 0.3 }}
                      className={cn(
                        "relative flex flex-col items-center justify-center rounded-xl border-2 p-3 aspect-square cursor-pointer transition-all",
                        isUnlocked
                          ? cn(style.border, style.bg, style.glow && `shadow-lg ${style.glow}`)
                          : "border-border/40 bg-muted/20 opacity-50 grayscale",
                        isSelected && "ring-2 ring-accent"
                      )}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedId(isSelected ? null : achievement.id)}
                    >
                      <span className="text-2xl sm:text-3xl mb-1">{achievement.icon}</span>
                      <span className="text-[10px] font-medium text-center leading-tight line-clamp-2">
                        {achievement.name}
                      </span>
                      {!isUnlocked && (
                        <div className="absolute top-1.5 right-1.5">
                          <Lock className="h-3 w-3 text-muted-foreground/60" />
                        </div>
                      )}
                      {isUnlocked && achievement.xp_reward > 0 && (
                        <span className="text-[9px] font-bold text-accent mt-0.5">+{achievement.xp_reward} XP</span>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Selected achievement detail - fixed overlay */}
              <AnimatePresence>
                {selectedId && (() => {
                  const achievement = permanentAchievements.find(a => a.id === selectedId);
                  if (!achievement) return null;
                  const isUnlocked = unlockedIds.has(achievement.id);
                  const style = RARITY_STYLES[achievement.rarity] || RARITY_STYLES.common;
                  return (
                    <>
                      {/* Backdrop */}
                      <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
                        onClick={() => setSelectedId(null)}
                      />
                      {/* Detail card */}
                      <motion.div
                        key="detail"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto"
                      >
                        <Card className={cn("border-2 shadow-xl", style.border)}>
                          <CardContent className="pt-5 pb-4">
                            <div className="flex flex-col items-center text-center gap-2">
                              <span className="text-5xl">{achievement.icon}</span>
                              <p className="font-bold text-base">{achievement.name}</p>
                              {achievement.description && (
                                <p className="text-sm text-muted-foreground">{achievement.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs px-2 py-0.5">
                                  {style.label}
                                </Badge>
                                {achievement.xp_reward > 0 && (
                                  <span className="text-xs text-accent font-semibold">+{achievement.xp_reward} XP</span>
                                )}
                              </div>
                              {!isUnlocked && (
                                <p className="text-xs text-muted-foreground italic mt-1">
                                  {achievement.criteria_type === "tasks_completed" && `Complete ${achievement.criteria_value} tarefas`}
                                  {achievement.criteria_type === "streak_days" && `Mantenha um streak de ${achievement.criteria_value} dias`}
                                  {achievement.criteria_type === "xp_total" && `Alcance ${achievement.criteria_value} XP`}
                                </p>
                              )}
                              <button
                                onClick={() => setSelectedId(null)}
                                className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              >
                                Fechar
                              </button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </>
                  );
                })()}
              </AnimatePresence>
            </>
          )}

          {/* Annual trophies */}
          {annualAchievements.length > 0 && (
            <Card>
              <CardContent className="pt-5">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                  🏆 Troféus Anuais
                </p>
                <div className="flex flex-wrap gap-2">
                  {annualAchievements.map((ua) => {
                    const style = RARITY_STYLES[ua.achievement?.rarity || "common"];
                    return (
                      <div
                        key={ua.id}
                        className={cn(
                          "px-3 py-1.5 rounded-full border-2 flex items-center gap-1.5",
                          style.border, style.bg
                        )}
                      >
                        <span className="text-sm">{ua.achievement?.icon}</span>
                        <span className="text-[10px] font-bold">{ua.achievement?.name}</span>
                        {ua.achievement?.annual_year && (
                          <span className="text-[9px] text-muted-foreground">{ua.achievement.annual_year}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </RequireApproval>
  );
}
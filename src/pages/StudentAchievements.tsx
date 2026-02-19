import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { useAchievements } from "@/hooks/useAchievements";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {permanentAchievements.map((achievement, i) => {
                const isUnlocked = unlockedIds.has(achievement.id);
                const style = RARITY_STYLES[achievement.rarity] || RARITY_STYLES.common;

                return (
                  <Tooltip key={achievement.id}>
                    <TooltipTrigger asChild>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.03, duration: 0.3 }}
                        className={cn(
                          "relative flex flex-col items-center justify-center rounded-xl border-2 p-3 aspect-square cursor-default transition-all",
                          isUnlocked
                            ? cn(style.border, style.bg, style.glow && `shadow-lg ${style.glow}`)
                            : "border-border/40 bg-muted/20 opacity-50 grayscale"
                        )}
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
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px]">
                      <p className="font-semibold text-xs">{achievement.name}</p>
                      {achievement.description && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{achievement.description}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className={cn(
                          "text-[9px] px-1 py-0",
                          isUnlocked && achievement.rarity === "legendary" && "border-amber-400 text-amber-600",
                          isUnlocked && achievement.rarity === "epic" && "border-purple-400 text-purple-600",
                          isUnlocked && achievement.rarity === "rare" && "border-blue-400 text-blue-600",
                        )}>
                          {style.label}
                        </Badge>
                        {achievement.xp_reward > 0 && (
                          <span className="text-[9px] text-accent font-medium">+{achievement.xp_reward} XP</span>
                        )}
                      </div>
                      {!isUnlocked && (
                        <p className="text-[10px] text-muted-foreground italic mt-1">
                          {achievement.criteria_type === "tasks_completed" && `Complete ${achievement.criteria_value} tarefas`}
                          {achievement.criteria_type === "streak_days" && `Mantenha um streak de ${achievement.criteria_value} dias`}
                          {achievement.criteria_type === "xp_total" && `Alcance ${achievement.criteria_value} XP`}
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
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
                      <Tooltip key={ua.id}>
                        <TooltipTrigger asChild>
                          <div className={cn(
                            "px-3 py-1.5 rounded-full border-2 flex items-center gap-1.5",
                            style.border, style.bg
                          )}>
                            <span className="text-sm">{ua.achievement?.icon}</span>
                            <span className="text-[10px] font-bold">{ua.achievement?.name}</span>
                            {ua.achievement?.annual_year && (
                              <span className="text-[9px] text-muted-foreground">{ua.achievement.annual_year}</span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{ua.achievement?.description}</p>
                        </TooltipContent>
                      </Tooltip>
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
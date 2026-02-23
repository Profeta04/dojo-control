import { useAchievements } from "@/hooks/useAchievements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const RARITY_STYLES: Record<string, { border: string; bg: string; glow: string; label: string }> = {
  common: { border: "border-muted-foreground/30", bg: "bg-muted/50", glow: "", label: "Comum" },
  rare: { border: "border-blue-400/50", bg: "bg-blue-500/10", glow: "shadow-blue-400/10", label: "Rara" },
  epic: { border: "border-purple-400/50", bg: "bg-purple-500/10", glow: "shadow-purple-400/20", label: "Épica" },
  legendary: { border: "border-amber-400/50", bg: "bg-amber-500/10", glow: "shadow-amber-400/30", label: "Lendária" },
};

interface AchievementsPanelProps {
  userId?: string;
  compact?: boolean;
  maxVisible?: number;
}

export function AchievementsPanel({ userId, compact = false, maxVisible }: AchievementsPanelProps) {
  const { allAchievements, unlockedAchievements, unlockedCount, totalCount, progressPercent, isLoading } = useAchievements(userId);

  if (isLoading) return null;

  const unlockedIds = new Set(unlockedAchievements.map(ua => ua.achievement_id));
  
  // For compact mode (profile), just show unlocked badges
  if (compact) {
    const badges = unlockedAchievements.slice(0, maxVisible || 8);
    if (badges.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1.5">
        {badges.map((ua) => {
          const rarity = ua.achievement?.rarity || "common";
          const style = RARITY_STYLES[rarity];
          return (
            <Tooltip key={ua.id}>
              <TooltipTrigger asChild>
                <motion.div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 cursor-default",
                    style.border, style.bg, style.glow && `shadow-lg ${style.glow}`
                  )}
                  whileHover={{ scale: 1.15 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <span className="text-sm">{ua.achievement?.icon || "🏅"}</span>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px]">
                <p className="font-semibold text-xs">{ua.achievement?.name}</p>
                <p className="text-[10px] text-muted-foreground">{ua.achievement?.description}</p>
                <Badge variant="outline" className="text-[9px] mt-1 px-1 py-0">
                  {style.label}
                </Badge>
              </TooltipContent>
            </Tooltip>
          );
        })}
        {unlockedAchievements.length > (maxVisible || 8) && (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
            +{unlockedAchievements.length - (maxVisible || 8)}
          </div>
        )}
      </div>
    );
  }

  // Full panel
  const rarityOrder: Record<string, number> = { legendary: 0, epic: 1, rare: 2, common: 3 };
  const permanentAchievements = allAchievements
    .filter(a => !a.is_annual)
    .sort((a, b) => (rarityOrder[a.rarity] ?? 4) - (rarityOrder[b.rarity] ?? 4));
  const annualAchievements = unlockedAchievements.filter(ua => ua.achievement?.is_annual);

  return (
    <Card data-tour="achievements-panel">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-5 w-5 text-accent" />
            Conquistas
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {unlockedCount}/{totalCount} ({progressPercent}%)
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
          {permanentAchievements.map((achievement) => {
            const isUnlocked = unlockedIds.has(achievement.id);
            const rarity = achievement.rarity;
            const style = RARITY_STYLES[rarity];

            return (
              <Tooltip key={achievement.id}>
                <TooltipTrigger asChild>
                  <motion.div
                    className={cn(
                      "relative aspect-square rounded-xl flex flex-col items-center justify-center border-2 transition-all cursor-default p-1",
                      isUnlocked
                        ? cn(style.border, style.bg, style.glow && `shadow-lg ${style.glow}`)
                        : "border-border/40 bg-muted/30 opacity-40 grayscale"
                    )}
                    whileHover={isUnlocked ? { scale: 1.08, y: -2 } : {}}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <span className="text-xl sm:text-2xl">{achievement.icon}</span>
                    {!isUnlocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/40 rounded-xl">
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    )}
                    {achievement.xp_reward > 0 && isUnlocked && (
                      <span className="text-[8px] font-bold text-accent mt-0.5">+{achievement.xp_reward}</span>
                    )}
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px]">
                  <div className="space-y-1">
                    <p className="font-semibold text-xs">{achievement.name}</p>
                    <p className="text-[10px] text-muted-foreground">{achievement.description}</p>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={cn(
                        "text-[9px] px-1 py-0",
                        isUnlocked && rarity === "legendary" && "border-amber-400 text-amber-600",
                        isUnlocked && rarity === "epic" && "border-purple-400 text-purple-600",
                        isUnlocked && rarity === "rare" && "border-blue-400 text-blue-600",
                      )}>
                        {style.label}
                      </Badge>
                      {achievement.xp_reward > 0 && (
                        <span className="text-[9px] text-accent font-medium">+{achievement.xp_reward} XP</span>
                      )}
                    </div>
                    {!isUnlocked && (
                      <p className="text-[10px] text-muted-foreground italic">
                        {achievement.criteria_type === "tasks_completed" && `Complete ${achievement.criteria_value} tarefas`}
                        {achievement.criteria_type === "streak_days" && `Mantenha um streak de ${achievement.criteria_value} dias`}
                        {achievement.criteria_type === "xp_total" && `Alcance ${achievement.criteria_value} XP`}
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Annual achievements section */}
        {annualAchievements.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Troféus Anuais</p>
            <div className="flex flex-wrap gap-2">
              {annualAchievements.map((ua) => {
                const style = RARITY_STYLES[ua.achievement?.rarity || "common"];
                return (
                  <Tooltip key={ua.id}>
                    <TooltipTrigger asChild>
                      <motion.div
                        className={cn(
                          "px-3 py-1.5 rounded-full border-2 flex items-center gap-1.5",
                          style.border, style.bg
                        )}
                        whileHover={{ scale: 1.05 }}
                      >
                        <span className="text-sm">{ua.achievement?.icon}</span>
                        <span className="text-[10px] font-bold">{ua.achievement?.name}</span>
                        {ua.achievement?.annual_year && (
                          <span className="text-[9px] text-muted-foreground">{ua.achievement.annual_year}</span>
                        )}
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{ua.achievement?.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

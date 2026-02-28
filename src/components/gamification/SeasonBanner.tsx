import { useSeasons } from "@/hooks/useSeasons";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { Calendar, Flame, Star, TrendingUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { xpForNextLevel, xpProgressInLevel } from "@/hooks/useXP";

export function SeasonBanner() {
  const {
    activeSeason,
    isLoading,
    seasonLevel,
    seasonTotalXp,
    gradient,
    bgClass,
    daysRemaining,
    seasonXP,
  } = useSeasons();

  if (isLoading || !activeSeason) return null;

  const progress = xpProgressInLevel(seasonTotalXp, seasonLevel);
  const needed = xpForNextLevel(seasonLevel);
  const progressPercent = Math.min((progress / needed) * 100, 100);
  const streak = seasonXP?.current_streak || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={cn("overflow-hidden border-0 shadow-lg", bgClass)}>
        {/* Gradient accent bar */}
        <div className={cn("h-1.5 bg-gradient-to-r", gradient)} />

        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            {/* Season info */}
            <div className="flex items-center gap-3">
              <motion.span
                className="text-2xl"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 3, repeatDelay: 2 }}
              >
                {activeSeason.icon}
              </motion.span>
              <div>
                <h3 className="text-sm font-bold tracking-tight">{activeSeason.name}</h3>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-2.5 w-2.5" />
                  {daysRemaining} dias restantes
                </p>
              </div>
            </div>

            {/* Season level */}
            <div className="flex items-center gap-2">
              {streak > 0 && (
                <div className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold",
                  streak >= 7 ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
                )}>
                  <Flame className="h-3 w-3" />
                  {streak}d
                </div>
              )}
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
                "bg-gradient-to-r", gradient, "text-white shadow-md"
              )}>
                <Star className="h-3.5 w-3.5 fill-white" />
                <span className="text-xs font-black">Nv. {seasonLevel}</span>
              </div>
            </div>
          </div>

          {/* Season XP progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-2.5 w-2.5" />
                XP da Temporada
              </span>
              <span className="font-semibold">{seasonTotalXp} XP total · {progress}/{needed} próx. nível</span>
            </div>
            <div className="relative">
              <Progress value={progressPercent} className="h-2.5 rounded-full" />
              <motion.div
                className={cn("absolute top-0 left-0 h-2.5 rounded-full bg-gradient-to-r opacity-80", gradient)}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Title reward teaser */}
          {activeSeason.title_reward && (
            <div className="mt-2.5 flex items-center justify-center">
              <Badge variant="outline" className="text-[10px] border-dashed">
                <Zap className="h-2.5 w-2.5 mr-1" />
                Recompensa: título "{activeSeason.title_reward}"
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

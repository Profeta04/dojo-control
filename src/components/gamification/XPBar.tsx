import { useXP } from "@/hooks/useXP";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Zap, TrendingUp, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface XPBarProps {
  compact?: boolean;
}

export function XPBar({ compact = false }: XPBarProps) {
  const {
    level,
    totalXp,
    currentProgress,
    neededForNext,
    progressPercent,
    currentStreak,
    streakMultiplier,
  } = useXP();

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20">
          <Star className="h-3.5 w-3.5 text-accent" />
          <span className="text-xs font-bold text-accent">Nv. {level}</span>
        </div>
        <div className="flex-1 min-w-0">
          <Progress value={progressPercent} className="h-2" />
        </div>
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {currentProgress}/{neededForNext} XP
        </span>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden border-accent/20" data-tour="xp-bar">
      <div className="h-1 bg-gradient-to-r from-accent via-accent/80 to-accent/50" />
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          {/* Level Badge */}
          <motion.div
            className="flex items-center gap-2"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center shadow-lg shadow-accent/20">
                <span className="text-lg font-black text-accent-foreground">{level}</span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 bg-card rounded-full p-0.5">
                <Star className="h-3.5 w-3.5 text-accent fill-accent" />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nível</p>
              <p className="text-sm font-bold">{totalXp} XP total</p>
            </div>
          </motion.div>

          {/* Streak & Multiplier */}
          <div className="flex items-center gap-3">
            {currentStreak > 0 && (
              <motion.div
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
                  currentStreak >= 7 ? "bg-warning/10 text-warning" : "bg-muted"
                )}
                animate={currentStreak >= 7 ? { scale: [1, 1.05, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Flame className={cn(
                  "h-4 w-4",
                  currentStreak >= 7 && "text-warning"
                )} />
                <span className="text-xs font-bold">{currentStreak}d</span>
              </motion.div>
            )}
            {streakMultiplier > 1 && (
              <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-success/10 text-success">
                <Zap className="h-3.5 w-3.5" />
                <span className="text-xs font-bold">{streakMultiplier}x</span>
              </div>
            )}
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Próximo nível
            </span>
            <span className="font-medium">{currentProgress} / {neededForNext} XP</span>
          </div>
          <div className="relative">
            <Progress value={progressPercent} className="h-3 rounded-full" />
            <AnimatePresence>
              {progressPercent > 10 && (
                <motion.div
                  className="absolute top-0 left-0 h-3 rounded-full bg-gradient-to-r from-accent/80 to-accent overflow-hidden"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

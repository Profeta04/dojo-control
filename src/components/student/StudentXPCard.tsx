import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XPBar } from "@/components/gamification/XPBar";
import { AchievementsPanel } from "@/components/gamification/AchievementsPanel";
import { Star, Zap } from "lucide-react";

export function StudentXPCard() {
  return (
    <Card data-tour="xp-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <Zap className="h-5 w-5 text-accent" />
          XP e Conquistas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <XPBar compact />

        <div className="pt-3 border-t border-border">
          <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 text-accent" />
            Conquistas
          </p>
          <AchievementsPanel compact maxVisible={6} />
        </div>
      </CardContent>
    </Card>
  );
}

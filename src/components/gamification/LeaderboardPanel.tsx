import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { Crown, Medal, Flame, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { SeasonAvatarBorder } from "@/components/gamification/SeasonAvatarBorder";

const PODIUM_STYLES = [
  { bg: "bg-amber-500/10", border: "border-amber-400/40", icon: "🥇", textColor: "text-amber-600" },
  { bg: "bg-gray-300/10", border: "border-gray-400/40", icon: "🥈", textColor: "text-gray-500" },
  { bg: "bg-orange-400/10", border: "border-orange-400/40", icon: "🥉", textColor: "text-orange-600" },
];

function LeaderboardAvatar({ avatarUrl, name, userId }: { avatarUrl: string | null; name: string; userId?: string }) {
  const publicUrl = avatarUrl
    ? supabase.storage.from("avatars").getPublicUrl(avatarUrl).data.publicUrl
    : null;
  return (
    <SeasonAvatarBorder userId={userId} size="sm">
      <Avatar className="h-8 w-8 border border-border">
        <AvatarImage src={publicUrl || undefined} alt={name} />
        <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
          {name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    </SeasonAvatarBorder>
  );
}

export function LeaderboardPanel() {
  const { leaderboard, isLoading, myRank, topThree, totalParticipants } = useLeaderboard();
  const { user } = useAuth();

  if (isLoading) return null;
  if (leaderboard.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Users className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Ranking será exibido quando houver atividade</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="h-5 w-5 text-amber-500" />
            Ranking do Dojo
          </CardTitle>
          {myRank && (
            <Badge variant="secondary" className="text-xs">
              Sua posição: #{myRank}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {/* Podium - Top 3 */}
        {topThree.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[1, 0, 2].map((podiumIdx) => {
              const entry = topThree[podiumIdx];
              if (!entry) return <div key={podiumIdx} />;
              const style = PODIUM_STYLES[podiumIdx];
              const isMe = entry.user_id === user?.id;

              return (
                <motion.div
                  key={entry.user_id}
                  className={cn(
                    "flex flex-col items-center p-3 rounded-xl border-2 transition-all",
                    style.bg, style.border,
                    podiumIdx === 0 && "row-start-1 -mt-2",
                    isMe && "ring-2 ring-accent/30"
                  )}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: podiumIdx * 0.1 }}
                >
                  <span className="text-xl mb-1">{style.icon}</span>
                  <LeaderboardAvatar avatarUrl={entry.avatar_url} name={entry.name} userId={entry.user_id} />
                  <p className="text-[11px] font-semibold mt-1.5 text-center truncate w-full">
                    {entry.name.split(" ")[0]}
                  </p>
                  <p className={cn("text-[10px] font-bold mt-0.5", style.textColor)}>
                    {entry.total_xp} XP
                  </p>
                  {entry.belt_grade && (
                    <div className="mt-1">
                      <BeltBadge grade={entry.belt_grade as any} size="sm" />
                    </div>
                  )}
                  {entry.achievement_count > 0 && (
                    <div className="flex items-center gap-0.5 mt-1">
                      <Medal className="h-2.5 w-2.5 text-accent" />
                      <span className="text-[9px] text-muted-foreground">{entry.achievement_count}</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Rest of leaderboard */}
        <div className="space-y-1">
          {leaderboard.slice(3).map((entry, idx) => {
            const isMe = entry.user_id === user?.id;
            const rank = idx + 4;

            return (
              <motion.div
                key={entry.user_id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                  isMe ? "bg-accent/5 border border-accent/20" : "hover:bg-muted/50"
                )}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <span className={cn(
                  "text-xs font-bold w-6 text-center",
                  rank <= 10 ? "text-foreground" : "text-muted-foreground"
                )}>
                  #{rank}
                </span>
                <LeaderboardAvatar avatarUrl={entry.avatar_url} name={entry.name} userId={entry.user_id} />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium truncate", isMe && "text-accent")}>
                    {entry.name}
                    {isMe && <span className="text-[10px] ml-1 text-muted-foreground">(você)</span>}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">Nv. {entry.level}</span>
                    {entry.current_streak > 0 && (
                      <span className="text-[10px] text-orange-500 flex items-center gap-0.5">
                        <Flame className="h-2.5 w-2.5" />
                        {entry.current_streak}d
                      </span>
                    )}
                    {entry.achievement_count > 0 && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Medal className="h-2.5 w-2.5" />
                        {entry.achievement_count}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold">{entry.total_xp}</p>
                  <p className="text-[9px] text-muted-foreground">XP</p>
                </div>
                {entry.belt_grade && (
                  <BeltBadge grade={entry.belt_grade as any} size="sm" />
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="text-center pt-2">
          <p className="text-[10px] text-muted-foreground">
            {totalParticipants} participantes no ranking
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

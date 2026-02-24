import { useState, useMemo } from "react";
import { useLeaderboard, LeaderboardEntry } from "@/hooks/useLeaderboard";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, Medal, Flame, Users, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const MARTIAL_ART_LABELS: Record<string, string> = {
  judo: "Judô",
  bjj: "Jiu-Jitsu",
};

function LeaderboardAvatar({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  const publicUrl = avatarUrl
    ? supabase.storage.from("avatars").getPublicUrl(avatarUrl).data.publicUrl
    : null;
  return (
    <Avatar className="h-8 w-8 border border-border">
      <AvatarImage src={publicUrl || undefined} alt={name} />
      <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
        {name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

const RANK_ICONS = ["🥇", "🥈", "🥉"];

export function LeaderboardPanel() {
  const { leaderboard, isLoading, myRank, totalParticipants, dojoClasses, availableMartialArts } = useLeaderboard();
  const { user } = useAuth();
  const [filterType, setFilterType] = useState<string>("all");

  // Filter and re-rank leaderboard
  const filteredLeaderboard = useMemo(() => {
    let filtered: LeaderboardEntry[];

    if (filterType === "all") {
      filtered = leaderboard;
    } else if (filterType.startsWith("art:")) {
      const art = filterType.replace("art:", "");
      filtered = leaderboard.filter((e) => e.martial_arts.includes(art));
    } else if (filterType.startsWith("class:")) {
      const classId = filterType.replace("class:", "");
      filtered = leaderboard.filter((e) => e.class_ids.includes(classId));
    } else {
      filtered = leaderboard;
    }

    // Re-rank after filtering
    return filtered.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
  }, [leaderboard, filterType]);

  const filteredMyRank = filteredLeaderboard.find((e) => e.user_id === user?.id)?.rank || null;

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

  const hasFilters = availableMartialArts.length > 1 || dojoClasses.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="h-5 w-5 text-amber-500" />
            Ranking do Dojo
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasFilters && (
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Geral</SelectItem>
                  {availableMartialArts.length > 1 && availableMartialArts.map((art) => (
                    <SelectItem key={art} value={`art:${art}`}>
                      {MARTIAL_ART_LABELS[art] || art}
                    </SelectItem>
                  ))}
                  {dojoClasses.map((cls) => (
                    <SelectItem key={cls.id} value={`class:${cls.id}`}>
                      📚 {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {filteredMyRank && (
              <Badge variant="secondary" className="text-xs">
                Sua posição: #{filteredMyRank}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-3">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Aluno</TableHead>
              <TableHead className="text-center hidden sm:table-cell">Faixa</TableHead>
              <TableHead className="text-center hidden sm:table-cell">Nível</TableHead>
              <TableHead className="text-center hidden sm:table-cell">
                <span className="flex items-center justify-center gap-1">
                  <Flame className="h-3 w-3" /> Streak
                </span>
              </TableHead>
              <TableHead className="text-center hidden sm:table-cell">
                <span className="flex items-center justify-center gap-1">
                  <Medal className="h-3 w-3" /> Troféus
                </span>
              </TableHead>
              <TableHead className="text-right">XP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeaderboard.map((entry) => {
              const isMe = entry.user_id === user?.id;
              const rank = entry.rank;
              return (
                <TableRow
                  key={entry.user_id}
                  className={cn(
                    isMe && "bg-accent/10 font-medium",
                    rank <= 3 && "bg-amber-500/[0.03]"
                  )}
                >
                  <TableCell className="text-center font-bold text-sm">
                    {rank <= 3 ? (
                      <span className="text-lg">{RANK_ICONS[rank - 1]}</span>
                    ) : (
                      <span className="text-muted-foreground">#{rank}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <LeaderboardAvatar avatarUrl={entry.avatar_url} name={entry.name} />
                      <div className="min-w-0">
                        <p className={cn("text-sm font-medium truncate", isMe && "text-primary")}>
                          {entry.name}
                          {isMe && <span className="text-[10px] ml-1 text-muted-foreground">(você)</span>}
                        </p>
                        {/* Mobile-only compact info */}
                        <div className="flex items-center gap-2 sm:hidden text-[10px] text-muted-foreground mt-0.5">
                          {entry.belt_grade && <BeltBadge grade={entry.belt_grade as any} size="sm" />}
                          <span>Nv.{entry.level}</span>
                          {entry.current_streak > 0 && (
                            <span className="flex items-center gap-0.5 text-orange-500">
                              <Flame className="h-2.5 w-2.5" />{entry.current_streak}d
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell">
                    {entry.belt_grade ? <BeltBadge grade={entry.belt_grade as any} size="sm" /> : "—"}
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell">
                    <Badge variant="outline" className="text-[10px]">Nv. {entry.level}</Badge>
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell">
                    {entry.current_streak > 0 ? (
                      <span className="flex items-center justify-center gap-0.5 text-orange-500 text-xs font-medium">
                        <Flame className="h-3 w-3" />{entry.current_streak}d
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center hidden sm:table-cell">
                    {entry.achievement_count > 0 ? (
                      <Badge variant="secondary" className="text-[10px]">{entry.achievement_count}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn("font-bold text-sm", rank <= 3 && "text-amber-600")}>
                      {entry.total_xp}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-0.5">XP</span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="text-center pt-3 px-4">
          <p className="text-[10px] text-muted-foreground">
            {filteredLeaderboard.length} participante{filteredLeaderboard.length !== 1 ? "s" : ""} no ranking
            {filterType !== "all" && ` (filtrado de ${totalParticipants})`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

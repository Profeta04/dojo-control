import { useMemo } from "react";
import { useLeaderboard, LeaderboardEntry, LeaderboardClassInfo } from "@/hooks/useLeaderboard";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Crown, Medal, Flame, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const MARTIAL_ART_LABELS: Record<string, string> = {
  judo: "Judô",
  bjj: "Jiu-Jitsu",
};

const MARTIAL_ART_ICONS: Record<string, string> = {
  judo: "🥋",
  bjj: "🤼",
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

function RankingTable({ entries, userId }: { entries: LeaderboardEntry[]; userId?: string }) {
  if (entries.length === 0) {
    return (
      <div className="py-6 text-center">
        <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
        <p className="text-xs text-muted-foreground">Nenhum aluno neste ranking ainda</p>
      </div>
    );
  }

  return (
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
        {entries.map((entry) => {
          const isMe = entry.user_id === userId;
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
  );
}

export function LeaderboardPanel() {
  const { leaderboard, isLoading, dojoClasses, availableMartialArts } = useLeaderboard();
  const { user } = useAuth();

  // Rankings by martial art
  const martialArtRankings = useMemo(() => {
    return availableMartialArts.map((art) => {
      const filtered = leaderboard
        .filter((e) => e.martial_arts.includes(art))
        .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
      return { art, label: MARTIAL_ART_LABELS[art] || art, icon: MARTIAL_ART_ICONS[art] || "🥋", entries: filtered };
    });
  }, [leaderboard, availableMartialArts]);

  // Rankings by class
  const classRankings = useMemo(() => {
    return dojoClasses.map((cls) => {
      const filtered = leaderboard
        .filter((e) => e.class_ids.includes(cls.id))
        .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
      return { cls, entries: filtered };
    });
  }, [leaderboard, dojoClasses]);

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
    <div className="space-y-6">
      {/* Rankings por Arte Marcial */}
      {martialArtRankings.map(({ art, label, icon, entries }) => (
        <Card key={art}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="text-lg">{icon}</span>
                Ranking de {label}
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {entries.length} aluno{entries.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-3">
            <RankingTable entries={entries} userId={user?.id} />
          </CardContent>
        </Card>
      ))}

      {/* Rankings por Turma */}
      {classRankings.map(({ cls, entries }) => (
        <Card key={cls.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Crown className="h-5 w-5 text-amber-500" />
                {cls.name}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {MARTIAL_ART_LABELS[cls.martial_art] || cls.martial_art}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {entries.length} aluno{entries.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-3">
            <RankingTable entries={entries} userId={user?.id} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

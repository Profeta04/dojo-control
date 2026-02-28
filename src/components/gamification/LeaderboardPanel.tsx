import { useMemo, useState } from "react";
import { useLeaderboard, LeaderboardEntry, LeaderboardClassInfo } from "@/hooks/useLeaderboard";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Crown, Medal, Flame, Users, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

const MARTIAL_ART_LABELS: Record<string, string> = {
  judo: "Judô",
  bjj: "Jiu-Jitsu",
};

const MARTIAL_ART_ICONS: Record<string, string> = {
  judo: "🥋",
  bjj: "🤼",
};

const MARTIAL_ART_COLORS: Record<string, { bg: string; border: string; hover: string; text: string }> = {
  judo: {
    bg: "bg-warning/10",
    border: "border-warning/30",
    hover: "hover:bg-warning/20",
    text: "text-warning",
  },
  bjj: {
    bg: "bg-info/10",
    border: "border-info/30",
    hover: "hover:bg-info/20",
    text: "text-info",
  },
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
                rank <= 3 && "bg-warning/[0.03]"
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
                        <span className="flex items-center gap-0.5 text-warning">
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
                  <span className="flex items-center justify-center gap-0.5 text-warning text-xs font-medium">
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
                <span className={cn("font-bold text-sm", rank <= 3 && "text-warning")}>
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

  const [selectedArt, setSelectedArt] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [viewChosen, setViewChosen] = useState(false);

  const step = !selectedArt ? "pick-art" as const : !viewChosen ? "pick-view" as const : "results" as const;

  // Filtered entries for "geral" (all students of selected art)
  const geralEntries = useMemo(() => {
    if (!selectedArt) return [];
    return leaderboard
      .filter((e) => e.martial_arts.includes(selectedArt))
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
  }, [leaderboard, selectedArt]);

  // Classes filtered by selected art
  const filteredClasses = useMemo(() => {
    if (!selectedArt) return [];
    return dojoClasses.filter((c) => c.martial_art === selectedArt);
  }, [dojoClasses, selectedArt]);

  // Single class ranking
  const selectedClassEntries = useMemo(() => {
    if (!selectedClassId) return [];
    return leaderboard
      .filter((e) => e.class_ids.includes(selectedClassId))
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
  }, [leaderboard, selectedClassId]);

  const selectedClassName = filteredClasses.find((c) => c.id === selectedClassId)?.name || "";

  const handleBack = () => {
    if (viewChosen) {
      setViewChosen(false);
      setSelectedClassId(null);
    } else {
      setSelectedArt(null);
    }
  };

  const handleSelectGeral = () => {
    setSelectedClassId(null);
    setViewChosen(true);
  };

  const handleSelectClass = (classId: string) => {
    setSelectedClassId(classId);
    setViewChosen(true);
  };

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
    <div className="space-y-4">
      {/* Back button */}
      <AnimatePresence>
        {step !== "pick-art" && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            onClick={handleBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* Step 1: Pick martial art */}
        {step === "pick-art" && (
          <motion.div
            key="pick-art"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="grid gap-3"
          >
            <p className="text-sm text-muted-foreground text-center mb-1">Selecione a arte marcial</p>
            {availableMartialArts.map((art) => {
              const colors = MARTIAL_ART_COLORS[art] || MARTIAL_ART_COLORS.judo;
              return (
                <motion.button
                  key={art}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedArt(art)}
                  className={cn(
                    "flex items-center gap-4 p-5 rounded-2xl border-2 transition-all shadow-md",
                    colors.bg, colors.border, colors.hover
                  )}
                >
                  <span className="text-3xl">{MARTIAL_ART_ICONS[art] || "🥋"}</span>
                  <div className="text-left">
                    <span className={cn("font-bold text-lg", colors.text)}>{MARTIAL_ART_LABELS[art] || art}</span>
                    <p className="text-xs text-muted-foreground">Ver ranking</p>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {/* Step 2: Pick Geral or specific class */}
        {step === "pick-view" && selectedArt && (
          <motion.div
            key="pick-view"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="grid gap-3"
          >
            <p className="text-sm text-muted-foreground text-center mb-1">
              {MARTIAL_ART_ICONS[selectedArt]} {MARTIAL_ART_LABELS[selectedArt]}
            </p>

            {/* Geral option */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSelectGeral}
              className="flex items-center gap-3 p-4 rounded-xl border border-warning/30 bg-warning/5 hover:bg-warning/10 transition-colors shadow-sm"
            >
              <Crown className="h-5 w-5 text-warning" />
              <div className="text-left">
                <span className="font-semibold text-sm text-foreground">Ranking Geral</span>
                <p className="text-xs text-muted-foreground">Todos os alunos de {MARTIAL_ART_LABELS[selectedArt]}</p>
              </div>
            </motion.button>

            {/* Each class as its own option */}
            {filteredClasses.map((cls) => (
              <motion.button
                key={cls.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectClass(cls.id)}
                className="flex items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors shadow-sm"
              >
                <Users className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <span className="font-semibold text-sm text-foreground">{cls.name}</span>
                  <p className="text-xs text-muted-foreground">Ranking da turma</p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Results: Geral */}
        {step === "results" && !selectedClassId && selectedArt && (
          <motion.div
            key="results-geral"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="text-lg">{MARTIAL_ART_ICONS[selectedArt]}</span>
                    Ranking Geral — {MARTIAL_ART_LABELS[selectedArt]}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {geralEntries.length} aluno{geralEntries.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-3">
                <RankingTable entries={geralEntries} userId={user?.id} />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Results: Specific class */}
        {step === "results" && selectedClassId && selectedArt && (
          <motion.div
            key={`results-${selectedClassId}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Crown className="h-5 w-5 text-warning" />
                    {selectedClassName}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {selectedClassEntries.length} aluno{selectedClassEntries.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-3">
                <RankingTable entries={selectedClassEntries} userId={user?.id} />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

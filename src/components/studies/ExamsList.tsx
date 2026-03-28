import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Trophy, Clock, BarChart3 } from "lucide-react";
import { ExamRunner } from "./ExamRunner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BELT_SECTIONS, getBeltSectionKey } from "@/lib/beltOrder";

const difficultyConfig: Record<string, { label: string; color: string }> = {
  easy: { label: "Fácil", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  medium: { label: "Médio", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  hard: { label: "Difícil", color: "bg-red-500/10 text-red-600 border-red-500/20" },
};

export function ExamsList() {
  const { profile } = useAuth();
  const [activeExam, setActiveExam] = useState<any>(null);

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ["exam-templates", profile?.dojo_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_templates")
        .select("*")
        .eq("martial_art", "judo")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile,
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ["exam-attempts", profile?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_attempts")
        .select("*")
        .eq("student_id", profile!.user_id)
        .order("completed_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.user_id,
  });

  if (activeExam) {
    return (
      <ExamRunner
        exam={activeExam}
        onFinish={() => setActiveExam(null)}
      />
    );
  }

  // Group exams by belt section
  const grouped = BELT_SECTIONS.map((section) => ({
    ...section,
    items: exams.filter(
      (exam: any) => getBeltSectionKey(exam.belt_level || "branca", exam.title) === section.key
    ),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {exams.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Nenhum simulado disponível ainda.</p>
            <p className="text-xs mt-1">O sensei pode criar simulados na área de conteúdo.</p>
          </CardContent>
        </Card>
      )}

      {grouped.map((group) => (
        <div key={group.key} className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground px-1">
            {group.label}
          </h3>
          <div className="grid gap-3">
            {group.items.map((exam: any) => {
              const examAttempts = attempts.filter((a: any) => a.exam_template_id === exam.id);
              const bestScore = examAttempts.length > 0
                ? Math.max(...examAttempts.map((a: any) => Math.round((a.score / a.total) * 100)))
                : null;
              const lastAttempt = examAttempts[0];
              const diff = difficultyConfig[exam.difficulty] || difficultyConfig.medium;

              return (
                <Card key={exam.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-accent/10">
                          <ClipboardCheck className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold">{exam.title}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {exam.total_questions} questões
                          </p>
                        </div>
                      </div>
                      <BeltBadge grade={exam.belt_level as any} size="sm" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={diff.color}>{diff.label}</Badge>
                      {bestScore !== null && (
                        <Badge variant="secondary" className="gap-1">
                          <Trophy className="h-3 w-3" />
                          Melhor: {bestScore}%
                        </Badge>
                      )}
                      {lastAttempt && (
                        <span className="text-[10px] text-muted-foreground">
                          Último: {format(new Date(lastAttempt.completed_at), "dd/MM", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => setActiveExam(exam)}
                    >
                      {examAttempts.length > 0 ? "Refazer Simulado" : "Iniciar Simulado"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

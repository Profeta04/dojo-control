import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SequentialQuizCard } from "./SequentialQuizCard";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { TaskWithAssignee } from "@/hooks/useTasks";
import {
  ClipboardList,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface TaskTemplate {
  id: string;
  title: string;
  description: string | null;
  options: string[] | null;
  correct_option: number | null;
  belt_level: string;
  difficulty: string;
  martial_art: string;
  category: string;
}

// Belt difficulty order (easiest to hardest)
const BELT_ORDER: Record<string, number> = {
  branca: 0,
  bordo: 1,
  cinza: 2,
  azul_escura: 3,
  azul: 4,
  amarela: 5,
  laranja: 6,
  verde: 7,
  roxa: 8,
  marrom: 9,
  preta_1dan: 10,
  preta_2dan: 11,
  preta_3dan: 12,
  preta_4dan: 13,
  preta_5dan: 14,
  preta_6dan: 15,
  preta_7dan: 16,
  preta_8dan: 17,
  preta_9dan: 18,
  preta_10dan: 19,
};

const DIFFICULTY_ORDER: Record<string, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
};

const BELT_LABELS: Record<string, string> = {
  branca: "Branca", bordo: "Bordô", cinza: "Cinza", azul_escura: "Azul Escura",
  azul: "Azul", amarela: "Amarela", laranja: "Laranja", verde: "Verde",
  roxa: "Roxa", marrom: "Marrom", preta_1dan: "Preta 1º Dan", preta_2dan: "Preta 2º Dan",
  preta_3dan: "Preta 3º Dan", preta_4dan: "Preta 4º Dan", preta_5dan: "Preta 5º Dan",
};

export function StudentTasksDashboard() {
  const { user } = useAuth();

  // 1. Fetch student's enrolled class martial arts
  const { data: studentMartialArts = [], isLoading: loadingArts } = useQuery({
    queryKey: ["student-martial-arts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: enrollments } = await supabase
        .from("class_students")
        .select("class_id")
        .eq("student_id", user.id);
      if (!enrollments || enrollments.length === 0) return [];

      const classIds = enrollments.map(e => e.class_id);
      const { data: classes } = await supabase
        .from("classes")
        .select("martial_art")
        .in("id", classIds);

      return [...new Set(classes?.map(c => c.martial_art) || [])];
    },
    enabled: !!user,
  });

  // 2. Fetch ALL templates for the student's martial arts, paginated
  const { data: allTemplates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["progressive-templates", studentMartialArts],
    queryFn: async () => {
      if (studentMartialArts.length === 0) return [];
      const templates: TaskTemplate[] = [];
      for (const art of studentMartialArts) {
        let from = 0;
        const PAGE = 1000;
        while (true) {
          const { data, error } = await supabase
            .from("task_templates")
            .select("id, title, description, options, correct_option, belt_level, difficulty, martial_art, category")
            .eq("martial_art", art)
            .range(from, from + PAGE - 1);
          if (error) throw error;
          if (data) templates.push(...(data as TaskTemplate[]));
          if (!data || data.length < PAGE) break;
          from += PAGE;
        }
      }
      return templates;
    },
    enabled: studentMartialArts.length > 0,
  });

  // 3. Fetch student's existing task records (completion tracking)
  const { data: completedTitles = new Set<string>(), isLoading: loadingTasks, refetch: refetchTasks } = useQuery({
    queryKey: ["student-completed-titles", user?.id],
    queryFn: async () => {
      if (!user) return new Set<string>();
      const titles = new Set<string>();
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("tasks")
          .select("title, status")
          .eq("assigned_to", user.id)
          .eq("status", "concluida")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (data) data.forEach(t => titles.add(t.title));
        if (!data || data.length < PAGE) break;
        from += PAGE;
      }
      return titles;
    },
    enabled: !!user,
  });

  // 4. Fetch pending task records (previously wrong answers)
  const { data: pendingTaskMap = new Map<string, string>() } = useQuery({
    queryKey: ["student-pending-tasks", user?.id],
    queryFn: async () => {
      if (!user) return new Map<string, string>();
      const map = new Map<string, string>();
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("tasks")
          .select("id, title, status")
          .eq("assigned_to", user.id)
          .eq("status", "pendente")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (data) data.forEach(t => { if (!map.has(t.title)) map.set(t.title, t.id); });
        if (!data || data.length < PAGE) break;
        from += PAGE;
      }
      return map;
    },
    enabled: !!user,
  });

  // 5. Sort templates by belt order + difficulty, filter only quiz-capable
  const sortedTemplates = useMemo(() => {
    return allTemplates
      .filter(t => t.options && t.correct_option !== null)
      .sort((a, b) => {
        const beltDiff = (BELT_ORDER[a.belt_level] ?? 99) - (BELT_ORDER[b.belt_level] ?? 99);
        if (beltDiff !== 0) return beltDiff;
        const diffDiff = (DIFFICULTY_ORDER[a.difficulty] ?? 1) - (DIFFICULTY_ORDER[b.difficulty] ?? 1);
        if (diffDiff !== 0) return diffDiff;
        return a.title.localeCompare(b.title);
      });
  }, [allTemplates]);

  // 6. Build the progressive queue: completed ones first (in order), then the NEXT uncompleted one
  const { quizQuestions, totalCompleted, totalQuestions, currentBelt } = useMemo(() => {
    const completed: { task: TaskWithAssignee; options: string[]; correctOption: number; xpValue: number }[] = [];
    let nextPending: { task: TaskWithAssignee; options: string[]; correctOption: number; xpValue: number } | null = null;
    let currentBeltLevel = "branca";

    for (const template of sortedTemplates) {
      const isCompleted = completedTitles.has(template.title);
      const existingTaskId = pendingTaskMap.get(template.title);

      const fakeTask: TaskWithAssignee = {
        id: existingTaskId || template.id,
        title: template.title,
        description: template.description,
        assigned_to: user?.id || "",
        assigned_by: "",
        due_date: null,
        status: isCompleted ? "concluida" : "pendente",
        priority: "normal",
        category: template.category as any,
        completed_at: null,
        created_at: "",
        updated_at: "",
        evidence_text: null,
        _templateId: template.id,
        _needsTaskRecord: !existingTaskId && !isCompleted,
      } as TaskWithAssignee & { _templateId: string; _needsTaskRecord: boolean };

      const question = {
        task: fakeTask,
        options: template.options as string[],
        correctOption: template.correct_option!,
        xpValue: 10,
      };

      if (isCompleted) {
        completed.push(question);
      } else if (!nextPending) {
        nextPending = question;
        currentBeltLevel = template.belt_level;
      }
    }

    // Show all completed + the next pending one
    const questions = nextPending ? [...completed, nextPending] : completed;

    return {
      quizQuestions: questions,
      totalCompleted: completed.length,
      totalQuestions: sortedTemplates.length,
      currentBelt: currentBeltLevel,
    };
  }, [sortedTemplates, completedTitles, pendingTaskMap, user?.id]);

  const progressPercent = totalQuestions > 0 ? Math.round((totalCompleted / totalQuestions) * 100) : 0;
  const pendingCount = totalQuestions - totalCompleted;
  const isLoading = loadingArts || loadingTemplates || loadingTasks;

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6" role="region" aria-label="Centro de Questões">
      {/* Progress Overview */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="overflow-hidden">
          <div className="h-1 bg-success" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Acertos</p>
                <p className="text-2xl font-bold mt-1">{totalCompleted}</p>
              </div>
              <div className="p-2 rounded-xl bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className="h-1 bg-primary" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Progresso</p>
                <p className="text-2xl font-bold mt-1">{progressPercent}%</p>
              </div>
              <div className="p-2 rounded-xl bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
            <Progress value={progressPercent} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
      </div>

      {/* Main Quiz Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5 text-primary" />
            Questões
          </CardTitle>
        </CardHeader>
        <CardContent>
          {quizQuestions.length === 0 || totalCompleted === totalQuestions ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                {totalCompleted === totalQuestions && totalQuestions > 0 ? (
                  <CheckCircle2 className="h-8 w-8 text-success" />
                ) : (
                  <ClipboardList className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <p className="text-sm">
                {totalCompleted === totalQuestions && totalQuestions > 0
                  ? "Parabéns! Você completou todas as questões! 🏆"
                  : "Nenhuma questão disponível. Verifique se você está matriculado em uma turma."}
              </p>
            </div>
          ) : (
            <SequentialQuizCard
              questions={quizQuestions}
              groupLabel="Progressão"
              onQuestionAnswered={refetchTasks}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

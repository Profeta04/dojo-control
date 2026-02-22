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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  audience: string;
}

// Belt difficulty order (easiest to hardest)
const BELT_ORDER: Record<string, number> = {
  branca: 0, bordo: 1, cinza: 2, azul_escura: 3, azul: 4, amarela: 5,
  laranja: 6, verde: 7, roxa: 8, marrom: 9, preta_1dan: 10, preta_2dan: 11,
  preta_3dan: 12, preta_4dan: 13, preta_5dan: 14, preta_6dan: 15,
  preta_7dan: 16, preta_8dan: 17, preta_9dan: 18, preta_10dan: 19,
};

const DIFFICULTY_ORDER: Record<string, number> = {
  easy: 0, medium: 1, hard: 2,
};

const MARTIAL_ART_LABELS: Record<string, string> = {
  judo: "Judô",
  bjj: "Jiu-Jitsu",
};

// Map class martial_art values to task_template martial_art values (can match multiple)
const CLASS_TO_TEMPLATE_ARTS: Record<string, string[]> = {
  judo: ["judo"],
  bjj: ["jiu-jitsu", "bjj"],
};

// Simple deterministic hash from string
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

// Seeded pseudo-random number generator
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export function StudentTasksDashboard() {
  const { user, profile } = useAuth();
  const [selectedArt, setSelectedArt] = useState<string | null>(null);

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

  // Set default selected art
  const activeArt = selectedArt || studentMartialArts[0] || null;
  const isMultiArt = studentMartialArts.length > 1;

  // 1b. Fetch student's belt for the active martial art
  const { data: studentBelt = "branca" } = useQuery({
    queryKey: ["student-belt-for-art", user?.id, activeArt],
    queryFn: async () => {
      if (!user || !activeArt) return "branca";
      const { data } = await supabase
        .from("student_belts")
        .select("belt_grade")
        .eq("user_id", user.id)
        .eq("martial_art", activeArt)
        .maybeSingle();
      return data?.belt_grade || profile?.belt_grade || "branca";
    },
    enabled: !!user && !!activeArt,
  });

  // 2. Fetch ALL templates for the selected martial art, paginated
  const templateArts = activeArt ? (CLASS_TO_TEMPLATE_ARTS[activeArt] || [activeArt]) : [];
  const { data: allTemplates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["progressive-templates", templateArts],
    queryFn: async () => {
      if (templateArts.length === 0) return [];
      const templates: TaskTemplate[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("task_templates")
          .select("id, title, description, options, correct_option, belt_level, difficulty, martial_art, category, audience")
          .in("martial_art", templateArts)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (data) templates.push(...(data as TaskTemplate[]));
        if (!data || data.length < PAGE) break;
        from += PAGE;
      }
      return templates;
    },
    enabled: templateArts.length > 0,
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
  // 5. Filter by student belt level (+2 ahead max) and shuffle deterministically
  const sortedTemplates = useMemo(() => {
    const studentBeltIndex = BELT_ORDER[studentBelt] ?? 0;
    const maxBeltIndex = studentBeltIndex + 2; // Allow up to 2 belts ahead

    const eligible = allTemplates
      .filter(t => {
        if (!t.options || t.correct_option === null) return false;
        const templateBeltIndex = BELT_ORDER[t.belt_level] ?? 99;
        return templateBeltIndex <= maxBeltIndex;
      });

    // Deterministic shuffle based on user ID
    const seed = hashCode(user?.id || "default");
    const rng = seededRandom(seed);

    // Shuffle eligible questions
    const shuffled = [...eligible];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Within the shuffle, still prioritize infantil over geral
    const infantil = shuffled.filter(t => t.audience === "infantil");
    const geral = shuffled.filter(t => t.audience !== "infantil");

    return [...infantil, ...geral];
  }, [allTemplates, studentBelt, user?.id]);

  // 6. Build the progressive queue
  const { quizQuestions, totalCompleted, totalQuestions } = useMemo(() => {
    const completed: { task: TaskWithAssignee; options: string[]; correctOption: number; xpValue: number; difficulty: string }[] = [];
    const pending: { task: TaskWithAssignee; options: string[]; correctOption: number; xpValue: number; difficulty: string }[] = [];

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
        difficulty: template.difficulty,
      };

      if (isCompleted) {
        completed.push(question);
      } else {
        pending.push(question);
      }
    }

    return {
      quizQuestions: [...completed, ...pending],
      totalCompleted: completed.length,
      totalQuestions: sortedTemplates.length,
    };
  }, [sortedTemplates, completedTitles, pendingTaskMap, user?.id]);

  const progressPercent = totalQuestions > 0 ? Math.round((totalCompleted / totalQuestions) * 100) : 0;
  const isLoading = loadingArts || loadingTemplates || loadingTasks;

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6" role="region" aria-label="Centro de Tarefas" data-tour="task-list">
      {/* Martial Art Tabs (only if multi-art) */}
      {isMultiArt && (
        <Tabs value={activeArt || ""} onValueChange={setSelectedArt}>
          <TabsList className="w-full">
            {studentMartialArts.map((art) => (
              <TabsTrigger key={art} value={art} className="flex-1">
                {MARTIAL_ART_LABELS[art] || art}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

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
            Tarefas {isMultiArt && activeArt ? `— ${MARTIAL_ART_LABELS[activeArt] || activeArt}` : ""}
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
                  ? "Parabéns! Você completou todas as tarefas! 🏆"
                  : "Nenhuma tarefa disponível. Verifique se você está matriculado em uma turma."}
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

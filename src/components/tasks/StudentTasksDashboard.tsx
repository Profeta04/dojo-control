import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTasks, TaskCategory, CATEGORY_CONFIG, TaskWithAssignee } from "@/hooks/useTasks";
import { SequentialQuizCard } from "./SequentialQuizCard";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  Trophy, 
  Filter, 
  BookOpen, 
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface TaskTemplate {
  id: string;
  title: string;
  options: string[] | null;
  correct_option: number | null;
}

// Seeded shuffle: each student gets a unique but consistent order
function seededShuffle<T>(arr: T[], seed: string): T[] {
  const result = [...arr];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  for (let i = result.length - 1; i > 0; i--) {
    hash = ((hash << 5) - hash + i) | 0;
    const j = Math.abs(hash) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function StudentTasksDashboard() {
  const { tasks, isLoading } = useTasks();
  const { user } = useAuth();
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | "all">("all");

  // Fetch only templates matching the student's task titles to avoid 1000-row limit
  const taskTitles = useMemo(() => tasks.map(t => t.title), [tasks]);

  const { data: templates = [] } = useQuery({
    queryKey: ["task-templates-options", taskTitles],
    queryFn: async () => {
      if (taskTitles.length === 0) return [];
      // Batch in chunks of 100 to avoid URL length issues with .in()
      const allTemplates: TaskTemplate[] = [];
      const uniqueTitles = [...new Set(taskTitles)];
      for (let i = 0; i < uniqueTitles.length; i += 100) {
        const batch = uniqueTitles.slice(i, i + 100);
        const { data, error } = await supabase
          .from("task_templates")
          .select("id, title, options, correct_option")
          .in("title", batch);
        if (error) throw error;
        if (data) allTemplates.push(...(data as TaskTemplate[]));
      }
      return allTemplates;
    },
    enabled: taskTitles.length > 0,
  });

  const templateDataMap = templates.reduce((acc, t) => {
    acc[t.title] = { options: t.options, correctOption: t.correct_option };
    return acc;
  }, {} as Record<string, { options: string[] | null; correctOption: number | null }>);

  // Deduplicate tasks by title first (prefer completed over pending)
  const deduplicatedTasks = useMemo(() => {
    const byTitle = new Map<string, TaskWithAssignee>();
    const sorted = [...tasks].sort((a, b) => 
      a.status === "concluida" ? -1 : b.status === "concluida" ? 1 : 0
    );
    for (const task of sorted) {
      if (!byTitle.has(task.title)) byTitle.set(task.title, task);
    }
    return Array.from(byTitle.values());
  }, [tasks]);

  const filteredTasks = deduplicatedTasks.filter(t => categoryFilter === "all" || t.category === categoryFilter);

  // Build quiz questions first so stats reflect only quiz-capable tasks
  const allQuizQuestions = useMemo(() => {
    const seenTitles = new Set<string>();
    const questions = filteredTasks
      .map(task => {
        if (seenTitles.has(task.title)) return null;
        seenTitles.add(task.title);
        const taskData = templateDataMap[task.title];
        if (!taskData?.options || taskData.correctOption === null) return null;
        return {
          task,
          options: taskData.options,
          correctOption: taskData.correctOption,
          xpValue: 10,
        };
      })
      .filter(Boolean) as { task: TaskWithAssignee; options: string[]; correctOption: number; xpValue: number }[];
    
    return seededShuffle(questions, user?.id || "default");
  }, [filteredTasks, templateDataMap, user?.id]);

  // Stats derived from quiz-capable tasks only
  const quizTasks = allQuizQuestions.map(q => q.task);
  const pendingTasks = quizTasks.filter(t => t.status === "pendente");
  const completedTasks = quizTasks.filter(t => t.status === "concluida");
  const overdueTasks = pendingTasks.filter(t => t.due_date && new Date(t.due_date) < new Date());

  const totalTasks = quizTasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;


  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6" role="region" aria-label="Centro de Questões">
      {/* Progress Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="overflow-hidden">
          <div className="h-1 bg-warning" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Pendentes</p>
                <p className="text-2xl font-bold mt-1">{pendingTasks.length}</p>
              </div>
              <div className="p-2 rounded-xl bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className="h-1 bg-success" />
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Respondidas</p>
                <p className="text-2xl font-bold mt-1">{completedTasks.length}</p>
              </div>
              <div className="p-2 rounded-xl bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <div className={cn("h-1", overdueTasks.length > 0 ? "bg-destructive" : "bg-muted")} />
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Atrasadas</p>
                <p className={cn("text-2xl font-bold mt-1", overdueTasks.length > 0 && "text-destructive")}>
                  {overdueTasks.length}
                </p>
              </div>
              <div className={cn("p-2 rounded-xl", overdueTasks.length > 0 ? "bg-destructive/10" : "bg-muted/50")}>
                <AlertTriangle className={cn("h-5 w-5", overdueTasks.length > 0 ? "text-destructive" : "text-muted-foreground")} />
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
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-primary" />
              Minhas Questões
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent>
          {allQuizQuestions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <ClipboardList className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm">Nenhuma questão disponível.</p>
            </div>
          ) : (
            <SequentialQuizCard
              questions={allQuizQuestions}
              groupLabel="Questões"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

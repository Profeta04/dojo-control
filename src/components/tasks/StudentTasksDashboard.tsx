import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTasks, TaskCategory, CATEGORY_CONFIG, TaskWithAssignee } from "@/hooks/useTasks";
import { TaskCard } from "./TaskCard";
import { TaskQuizCard } from "./TaskQuizCard";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  Trophy, 
  Filter, 
  BookOpen, 
  ChevronDown, 
  ChevronRight, 
  Dumbbell,
  Scroll,
  Home,
  Target,
  User,
  RotateCcw,
  Scale,
  Medal,
  LucideIcon,
  Briefcase,
  MoreHorizontal,
  Swords,
  AlertTriangle,
  TrendingUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TaskTemplate {
  id: string;
  title: string;
  options: string[] | null;
  correct_option: number | null;
  video_url: string | null;
}

// Define the thematic groups for quizzes with Lucide icons
const THEMATIC_GROUPS: { id: string; label: string; icon: LucideIcon; keywords: string[] }[] = [
  { id: "historia", label: "História do Judô", icon: Scroll, keywords: ["Judô", "Jigoro", "criou", "criado", "Kodokan", "nasceu", "veio", "significa Judô"] },
  { id: "vocabulario", label: "Vocabulário do Dojo", icon: Home, keywords: ["Dojô", "Judogi", "Obi", "Sensei", "Tatame"] },
  { id: "comandos", label: "Comandos e Papéis", icon: Target, keywords: ["Tori", "Uke", "Rei", "Hajime", "Matte", "Randori"] },
  { id: "posturas", label: "Posturas e Pegadas", icon: User, keywords: ["Shizen-tai", "Jigo-tai", "Kumi-kata"] },
  { id: "ukemi", label: "Quedas (Ukemi)", icon: RotateCcw, keywords: ["Ukemi", "Mae Ukemi", "Ushiro Ukemi", "Yoko Ukemi", "Zenpo Kaiten", "quedas"] },
  { id: "principios", label: "Princípios do Judô", icon: Scale, keywords: ["Jita Kyoei", "Seiryoku Zenyo"] },
  { id: "olimpico", label: "Judô Olímpico", icon: Medal, keywords: ["olímpico", "primeira faixa"] },
];

function getThematicGroup(title: string): string {
  for (const group of THEMATIC_GROUPS) {
    if (group.keywords.some(keyword => title.toLowerCase().includes(keyword.toLowerCase()))) {
      return group.id;
    }
  }
  return "outros";
}

interface GroupedTasks {
  groupId: string;
  label: string;
  icon: LucideIcon;
  tasks: TaskWithAssignee[];
}

export function StudentTasksDashboard() {
  const { tasks, isLoading, updateTaskStatus } = useTasks();
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | "all">("all");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Fetch task templates to get quiz options
  const { data: templates = [] } = useQuery({
    queryKey: ["task-templates-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_templates")
        .select("id, title, options, correct_option, video_url");
      if (error) throw error;
      return data as TaskTemplate[];
    },
  });

  const templateDataMap = templates.reduce((acc, t) => {
    acc[t.title] = { options: t.options, correctOption: t.correct_option, videoUrl: t.video_url };
    return acc;
  }, {} as Record<string, { options: string[] | null; correctOption: number | null; videoUrl: string | null }>);

  const filteredTasks = tasks.filter(t => categoryFilter === "all" || t.category === categoryFilter);
  const pendingTasks = filteredTasks.filter(t => t.status === "pendente");
  const completedTasks = filteredTasks.filter(t => t.status === "concluida");
  const overdueTasks = pendingTasks.filter(t => t.due_date && new Date(t.due_date) < new Date());

  const quizTasks = pendingTasks.filter(t => {
    const data = templateDataMap[t.title];
    return data && data.options && data.correctOption !== null;
  });
  const regularPendingTasks = pendingTasks.filter(t => {
    const data = templateDataMap[t.title];
    return !data || !data.options || data.correctOption === null;
  });

  // Progress percentage
  const totalTasks = filteredTasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  // Group quiz tasks by thematic category
  const groupedQuizTasks = useMemo((): GroupedTasks[] => {
    const groups: Record<string, TaskWithAssignee[]> = {};
    quizTasks.forEach((task) => {
      const groupId = getThematicGroup(task.title);
      if (!groups[groupId]) groups[groupId] = [];
      groups[groupId].push(task);
    });
    return THEMATIC_GROUPS
      .filter(group => groups[group.id]?.length > 0)
      .map(group => ({
        groupId: group.id, label: group.label, icon: group.icon,
        tasks: groups[group.id].sort((a, b) => a.title.localeCompare(b.title)),
      }));
  }, [quizTasks]);

  const groupedCompletedQuizTasks = useMemo((): GroupedTasks[] => {
    const completedQuizzes = completedTasks.filter(t => {
      const data = templateDataMap[t.title];
      return data && data.options && data.correctOption !== null;
    });
    const groups: Record<string, TaskWithAssignee[]> = {};
    completedQuizzes.forEach((task) => {
      const groupId = getThematicGroup(task.title);
      if (!groups[groupId]) groups[groupId] = [];
      groups[groupId].push(task);
    });
    return THEMATIC_GROUPS
      .filter(group => groups[group.id]?.length > 0)
      .map(group => ({
        groupId: group.id, label: group.label, icon: group.icon,
        tasks: groups[group.id].sort((a, b) => a.title.localeCompare(b.title)),
      }));
  }, [completedTasks, templateDataMap]);

  const regularCompletedTasks = completedTasks.filter(t => {
    const data = templateDataMap[t.title];
    return !data || !data.options || data.correctOption === null;
  });

  const CATEGORY_ICONS: Record<TaskCategory, LucideIcon> = {
    tecnica: Swords, fisica: Dumbbell, administrativa: Briefcase, outra: MoreHorizontal,
  };

  const groupedRegularPendingTasks = useMemo((): GroupedTasks[] => {
    const groups: Record<string, TaskWithAssignee[]> = {};
    regularPendingTasks.forEach((task) => {
      const cat = task.category as TaskCategory;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(task);
    });
    return (Object.keys(CATEGORY_CONFIG) as TaskCategory[])
      .filter(cat => groups[cat]?.length > 0)
      .map(cat => ({
        groupId: `practical-${cat}`, label: CATEGORY_CONFIG[cat].label, icon: CATEGORY_ICONS[cat],
        tasks: groups[cat].sort((a, b) => a.title.localeCompare(b.title)),
      }));
  }, [regularPendingTasks]);

  const groupedRegularCompletedTasks = useMemo((): GroupedTasks[] => {
    const groups: Record<string, TaskWithAssignee[]> = {};
    regularCompletedTasks.forEach((task) => {
      const cat = task.category as TaskCategory;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(task);
    });
    return (Object.keys(CATEGORY_CONFIG) as TaskCategory[])
      .filter(cat => groups[cat]?.length > 0)
      .map(cat => ({
        groupId: `practical-completed-${cat}`, label: CATEGORY_CONFIG[cat].label, icon: CATEGORY_ICONS[cat],
        tasks: groups[cat].sort((a, b) => a.title.localeCompare(b.title)),
      }));
  }, [regularCompletedTasks]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const handleStatusChange = async (taskId: string, status: "pendente" | "concluida" | "cancelada") => {
    try {
      await updateTaskStatus.mutateAsync({ taskId, status });
      toast.success(status === "concluida" ? "Tarefa concluída! 🎉" : "Tarefa reaberta");
    } catch {
      toast.error("Erro ao atualizar tarefa");
    }
  };

  if (isLoading) return <LoadingSpinner />;

  const renderGroupedTasks = (groups: GroupedTasks[], prefix: string, showCompleted = false, isPractical = false) => (
    <div className="space-y-2">
      {groups.map((group, groupIndex) => {
        const isOpen = openGroups[`${prefix}-${group.groupId}`] ?? false;
        const globalStartIndex = groups.slice(0, groupIndex).reduce((sum, g) => sum + g.tasks.length, 0);
        const completedInGroup = group.tasks.filter(t => t.status === "concluida").length;
        const groupProgress = Math.round((completedInGroup / group.tasks.length) * 100);

        return (
          <Collapsible
            key={group.groupId}
            open={isOpen}
            onOpenChange={() => toggleGroup(`${prefix}-${group.groupId}`)}
          >
            <CollapsibleTrigger className="w-full">
              <div className={cn(
                "flex items-center justify-between p-3 rounded-xl transition-all duration-200 cursor-pointer",
                isOpen ? "bg-primary/10 shadow-sm" : "bg-muted/40 hover:bg-muted/70"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-1.5 rounded-lg",
                    isOpen ? "bg-primary/20" : "bg-muted"
                  )}>
                    <group.icon className={cn(
                      "h-4 w-4",
                      isOpen ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <span className={cn(
                    "font-medium text-sm",
                    isOpen && "text-primary"
                  )}>{group.label}</span>
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-semibold">
                    {group.tasks.length}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {showCompleted && groupProgress > 0 && (
                    <span className="text-[10px] text-muted-foreground">{groupProgress}%</span>
                  )}
                  <div className={cn(
                    "transition-transform duration-200",
                    isOpen && "rotate-90"
                  )}>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-2 pl-3 ml-5 border-l-2 border-primary/15">
                {group.tasks.map((task, taskIndex) => {
                  const taskData = templateDataMap[task.title];
                  const taskNumber = globalStartIndex + taskIndex + 1;
                  
                  return (
                    <div key={task.id} className="relative animate-fade-in" style={{ animationDelay: `${taskIndex * 50}ms` }}>
                      <div className="absolute -left-[21px] top-4 w-5 h-5 rounded-full bg-background border-2 border-primary/30 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-primary">{taskNumber}</span>
                      </div>
                      {showCompleted || isPractical ? (
                        <TaskCard
                          task={task}
                          onStatusChange={handleStatusChange}
                          videoUrl={taskData?.videoUrl || undefined}
                        />
                      ) : (
                        <TaskQuizCard
                          task={task}
                          options={taskData.options!}
                          correctOption={taskData.correctOption!}
                          videoUrl={taskData.videoUrl || undefined}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6" role="region" aria-label="Painel de Tarefas do Aluno">
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
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Concluídas</p>
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

      {/* Main Tasks Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5 text-primary" />
              Minhas Tarefas
            </CardTitle>
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-2 flex-wrap mt-3" role="group" aria-label="Filtros de categoria">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <button
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-all duration-200",
                categoryFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              )}
              onClick={() => setCategoryFilter("all")}
              aria-pressed={categoryFilter === "all"}
            >
              Todas
            </button>
            {(Object.keys(CATEGORY_CONFIG) as TaskCategory[]).map((cat) => (
              <button
                key={cat}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-all duration-200",
                  categoryFilter === cat 
                    ? cn(CATEGORY_CONFIG[cat].bgColor, CATEGORY_CONFIG[cat].color, "shadow-sm")
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                )}
                onClick={() => setCategoryFilter(cat)}
                aria-pressed={categoryFilter === cat}
              >
                {CATEGORY_CONFIG[cat].label}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-10" aria-label="Abas de tarefas">
              <TabsTrigger value="pending" className="flex items-center gap-2 text-sm data-[state=active]:shadow-sm">
                <Clock className="h-3.5 w-3.5" />
                Pendentes
                <Badge variant="secondary" className="ml-1 h-5 text-[10px] px-1.5">
                  {pendingTasks.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2 text-sm data-[state=active]:shadow-sm">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Concluídas
                <Badge variant="secondary" className="ml-1 h-5 text-[10px] px-1.5">
                  {completedTasks.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4 space-y-5">
              {pendingTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                    <Trophy className="h-8 w-8 text-success" />
                  </div>
                  <p className="font-medium text-foreground">Parabéns!</p>
                  <p className="text-sm mt-1">Nenhuma tarefa pendente. Continue assim! 🥋</p>
                </div>
              ) : (
                <>
                  {groupedQuizTasks.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <BookOpen className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm font-semibold">Questões Teóricas</span>
                        <Badge variant="outline" className="text-[10px]">{quizTasks.length}</Badge>
                      </div>
                      {renderGroupedTasks(groupedQuizTasks, "pending")}
                    </div>
                  )}

                  {groupedRegularPendingTasks.length > 0 && (
                    <div className="space-y-3">
                      {groupedQuizTasks.length > 0 && <div className="border-t border-border" />}
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-accent/10">
                          <Dumbbell className="h-4 w-4 text-accent" />
                        </div>
                        <span className="text-sm font-semibold">Tarefas Práticas</span>
                        <Badge variant="outline" className="text-[10px]">{regularPendingTasks.length}</Badge>
                      </div>
                      {renderGroupedTasks(groupedRegularPendingTasks, "practical", false, true)}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-4 space-y-5">
              {completedTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <ClipboardList className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm">Nenhuma tarefa concluída ainda.</p>
                </div>
              ) : (
                <>
                  {groupedCompletedQuizTasks.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-success/10">
                          <BookOpen className="h-4 w-4 text-success" />
                        </div>
                        <span className="text-sm font-semibold">Questões Teóricas Concluídas</span>
                      </div>
                      {renderGroupedTasks(groupedCompletedQuizTasks, "completed", true)}
                    </div>
                  )}

                  {groupedRegularCompletedTasks.length > 0 && (
                    <div className="space-y-3">
                      {groupedCompletedQuizTasks.length > 0 && <div className="border-t border-border" />}
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-success/10">
                          <Dumbbell className="h-4 w-4 text-success" />
                        </div>
                        <span className="text-sm font-semibold">Tarefas Práticas Concluídas</span>
                        <Badge variant="outline" className="text-[10px]">{regularCompletedTasks.length}</Badge>
                      </div>
                      {renderGroupedTasks(groupedRegularCompletedTasks, "practical-completed", true, true)}
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

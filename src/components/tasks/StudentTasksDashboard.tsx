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
  LucideIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  {
    id: "historia",
    label: "História do Judô",
    icon: Scroll,
    keywords: ["Judô", "Jigoro", "criou", "criado", "Kodokan", "nasceu", "veio", "significa Judô"],
  },
  {
    id: "vocabulario",
    label: "Vocabulário do Dojo",
    icon: Home,
    keywords: ["Dojô", "Judogi", "Obi", "Sensei", "Tatame"],
  },
  {
    id: "comandos",
    label: "Comandos e Papéis",
    icon: Target,
    keywords: ["Tori", "Uke", "Rei", "Hajime", "Matte", "Randori"],
  },
  {
    id: "posturas",
    label: "Posturas e Pegadas",
    icon: User,
    keywords: ["Shizen-tai", "Jigo-tai", "Kumi-kata"],
  },
  {
    id: "ukemi",
    label: "Quedas (Ukemi)",
    icon: RotateCcw,
    keywords: ["Ukemi", "Mae Ukemi", "Ushiro Ukemi", "Yoko Ukemi", "Zenpo Kaiten", "quedas"],
  },
  {
    id: "principios",
    label: "Princípios do Judô",
    icon: Scale,
    keywords: ["Jita Kyoei", "Seiryoku Zenyo"],
  },
  {
    id: "olimpico",
    label: "Judô Olímpico",
    icon: Medal,
    keywords: ["olímpico", "primeira faixa"],
  },
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

  // Create a map of task title to quiz options and video URL
  const templateDataMap = templates.reduce((acc, t) => {
    acc[t.title] = { 
      options: t.options, 
      correctOption: t.correct_option,
      videoUrl: t.video_url 
    };
    return acc;
  }, {} as Record<string, { options: string[] | null; correctOption: number | null; videoUrl: string | null }>);

  const filteredTasks = tasks.filter(t => 
    categoryFilter === "all" || t.category === categoryFilter
  );

  const pendingTasks = filteredTasks.filter(t => t.status === "pendente");
  const completedTasks = filteredTasks.filter(t => t.status === "concluida");
  const overdueTasks = pendingTasks.filter(t => 
    t.due_date && new Date(t.due_date) < new Date()
  );

  // Separate quiz tasks from regular tasks
  const quizTasks = pendingTasks.filter(t => {
    const data = templateDataMap[t.title];
    return data && data.options && data.correctOption !== null;
  });
  const regularPendingTasks = pendingTasks.filter(t => {
    const data = templateDataMap[t.title];
    return !data || !data.options || data.correctOption === null;
  });

  // Group quiz tasks by thematic category
  const groupedQuizTasks = useMemo((): GroupedTasks[] => {
    const groups: Record<string, TaskWithAssignee[]> = {};
    
    quizTasks.forEach((task) => {
      const groupId = getThematicGroup(task.title);
      if (!groups[groupId]) {
        groups[groupId] = [];
      }
      groups[groupId].push(task);
    });

    // Sort each group's tasks alphabetically and create the final structure
    return THEMATIC_GROUPS
      .filter(group => groups[group.id] && groups[group.id].length > 0)
      .map(group => ({
        groupId: group.id,
        label: group.label,
        icon: group.icon,
        tasks: groups[group.id].sort((a, b) => a.title.localeCompare(b.title)),
      }));
  }, [quizTasks]);

  // Group completed quiz tasks
  const groupedCompletedQuizTasks = useMemo((): GroupedTasks[] => {
    const completedQuizzes = completedTasks.filter(t => {
      const data = templateDataMap[t.title];
      return data && data.options && data.correctOption !== null;
    });

    const groups: Record<string, TaskWithAssignee[]> = {};
    
    completedQuizzes.forEach((task) => {
      const groupId = getThematicGroup(task.title);
      if (!groups[groupId]) {
        groups[groupId] = [];
      }
      groups[groupId].push(task);
    });

    return THEMATIC_GROUPS
      .filter(group => groups[group.id] && groups[group.id].length > 0)
      .map(group => ({
        groupId: group.id,
        label: group.label,
        icon: group.icon,
        tasks: groups[group.id].sort((a, b) => a.title.localeCompare(b.title)),
      }));
  }, [completedTasks, templateDataMap]);

  // Regular completed tasks
  const regularCompletedTasks = completedTasks.filter(t => {
    const data = templateDataMap[t.title];
    return !data || !data.options || data.correctOption === null;
  });

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

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const renderGroupedTasks = (groups: GroupedTasks[], prefix: string, showCompleted = false) => (
    <div className="space-y-3">
      {groups.map((group, groupIndex) => {
        const isOpen = openGroups[`${prefix}-${group.groupId}`] ?? false;
        const globalStartIndex = groups
          .slice(0, groupIndex)
          .reduce((sum, g) => sum + g.tasks.length, 0);

        return (
          <Collapsible
            key={group.groupId}
            open={isOpen}
            onOpenChange={() => toggleGroup(`${prefix}-${group.groupId}`)}
          >
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <group.icon className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{group.label}</span>
                  <Badge variant="secondary" className="text-xs">
                    {group.tasks.length}
                  </Badge>
                </div>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <ul className="space-y-3 pl-2 border-l-2 border-muted ml-4">
                {group.tasks.map((task, taskIndex) => {
                  const quizData = templateDataMap[task.title];
                  const taskNumber = globalStartIndex + taskIndex + 1;
                  
                  return (
                    <li key={task.id} className="relative">
                      <div className="absolute -left-6 top-4 w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-primary">{taskNumber}</span>
                      </div>
                      {showCompleted ? (
                        <TaskCard
                          task={task}
                          onStatusChange={handleStatusChange}
                          videoUrl={quizData?.videoUrl || undefined}
                        />
                      ) : (
                        <TaskQuizCard
                          task={task}
                          options={quizData.options!}
                          correctOption={quizData.correctOption!}
                          videoUrl={quizData.videoUrl || undefined}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6" role="region" aria-label="Painel de Tarefas do Aluno">
      {/* Tasks List - Now first */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
            <span>Minhas Tarefas</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Category Filters */}
          <div 
            className="flex items-center gap-2 flex-wrap mb-4" 
            role="group" 
            aria-label="Filtros de categoria"
          >
            <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Badge
              variant={categoryFilter === "all" ? "default" : "outline"}
              className="cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setCategoryFilter("all")}
              onKeyDown={(e) => e.key === "Enter" && setCategoryFilter("all")}
              tabIndex={0}
              role="button"
              aria-pressed={categoryFilter === "all"}
              aria-label="Mostrar todas as categorias"
            >
              Todas
            </Badge>
            {(Object.keys(CATEGORY_CONFIG) as TaskCategory[]).map((cat) => (
              <Badge
                key={cat}
                variant="outline"
                className={cn(
                  "cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  categoryFilter === cat 
                    ? cn(CATEGORY_CONFIG[cat].bgColor, CATEGORY_CONFIG[cat].color, "border-0")
                    : "hover:bg-muted"
                )}
                onClick={() => setCategoryFilter(cat)}
                onKeyDown={(e) => e.key === "Enter" && setCategoryFilter(cat)}
                tabIndex={0}
                role="button"
                aria-pressed={categoryFilter === cat}
                aria-label={`Filtrar por ${CATEGORY_CONFIG[cat].label}`}
              >
                {CATEGORY_CONFIG[cat].label}
              </Badge>
            ))}
          </div>

          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2" aria-label="Abas de tarefas">
              <TabsTrigger 
                value="pending" 
                className="flex items-center gap-2"
                aria-label={`Tarefas pendentes: ${pendingTasks.length}`}
              >
                <Clock className="h-4 w-4" aria-hidden="true" />
                <span>Pendentes ({pendingTasks.length})</span>
              </TabsTrigger>
              <TabsTrigger 
                value="completed" 
                className="flex items-center gap-2"
                aria-label={`Tarefas concluídas: ${completedTasks.length}`}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>Concluídas ({completedTasks.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4 space-y-4" role="tabpanel" aria-label="Lista de tarefas pendentes">
              {pendingTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" role="status" aria-live="polite">
                  <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
                  <p>Nenhuma tarefa pendente!</p>
                  <p className="text-sm">Continue assim! 🥋</p>
                </div>
              ) : (
                <>
                  {/* Quiz Tasks Section - Grouped */}
                  {groupedQuizTasks.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <BookOpen className="h-4 w-4" />
                        <span>Questões Teóricas ({quizTasks.length})</span>
                      </div>
                      {renderGroupedTasks(groupedQuizTasks, "pending")}
                    </div>
                  )}

                  {/* Regular Tasks Section */}
                  {regularPendingTasks.length > 0 && (
                    <div className="space-y-3">
                      {groupedQuizTasks.length > 0 && (
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mt-4">
                          <Dumbbell className="h-4 w-4" />
                          <span>Tarefas Práticas ({regularPendingTasks.length})</span>
                        </div>
                      )}
                      <ul className="space-y-3" aria-label="Tarefas práticas">
                        {regularPendingTasks.map((task, index) => {
                          const taskData = templateDataMap[task.title];
                          return (
                            <li key={task.id} className="relative">
                              <div className="absolute -left-1 top-4 w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-[10px] font-bold text-muted-foreground">{index + 1}</span>
                              </div>
                              <div className="ml-6">
                                <TaskCard
                                  task={task}
                                  onStatusChange={handleStatusChange}
                                  videoUrl={taskData?.videoUrl || undefined}
                                />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-4 space-y-4" role="tabpanel" aria-label="Lista de tarefas concluídas">
              {completedTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" role="status" aria-live="polite">
                  <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
                  <p>Nenhuma tarefa concluída ainda.</p>
                </div>
              ) : (
                <>
                  {/* Completed Quiz Tasks - Grouped */}
                  {groupedCompletedQuizTasks.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-success">
                        <BookOpen className="h-4 w-4" />
                        <span>Questões Teóricas Concluídas</span>
                      </div>
                      {renderGroupedTasks(groupedCompletedQuizTasks, "completed", true)}
                    </div>
                  )}

                  {/* Regular Completed Tasks */}
                  {regularCompletedTasks.length > 0 && (
                    <div className="space-y-3">
                      {groupedCompletedQuizTasks.length > 0 && (
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mt-4">
                          <Dumbbell className="h-4 w-4" />
                          <span>Tarefas Práticas Concluídas ({regularCompletedTasks.length})</span>
                        </div>
                      )}
                      <ul className="space-y-3" aria-label="Tarefas práticas concluídas">
                        {regularCompletedTasks.map((task, index) => {
                          const taskData = templateDataMap[task.title];
                          return (
                            <li key={task.id} className="relative">
                              <div className="absolute -left-1 top-4 w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-[10px] font-bold text-muted-foreground">{index + 1}</span>
                              </div>
                              <div className="ml-6">
                                <TaskCard
                                  task={task}
                                  onStatusChange={handleStatusChange}
                                  videoUrl={taskData?.videoUrl || undefined}
                                />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Stats Cards - Now below */}
      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">Estatísticas das tarefas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card role="region" aria-labelledby="pending-stats">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle id="pending-stats" className="text-sm font-medium text-muted-foreground">
                Pendentes
              </CardTitle>
              <Clock className="h-4 w-4 text-warning" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" aria-label={`${pendingTasks.length} tarefas pendentes`}>
                {pendingTasks.length}
              </div>
              {overdueTasks.length > 0 && (
                <p className="text-xs text-destructive mt-1" role="alert">
                  {overdueTasks.length} atrasada(s)
                </p>
              )}
            </CardContent>
          </Card>

          <Card role="region" aria-labelledby="completed-stats">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle id="completed-stats" className="text-sm font-medium text-muted-foreground">
                Concluídas
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" aria-label={`${completedTasks.length} tarefas concluídas`}>
                {completedTasks.length}
              </div>
            </CardContent>
          </Card>

          <Card role="region" aria-labelledby="total-stats">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle id="total-stats" className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
              <ClipboardList className="h-4 w-4 text-primary" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" aria-label={`${filteredTasks.length} tarefas no total`}>
                {filteredTasks.length}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

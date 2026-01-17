import { useState } from "react";
import { useTasks, TaskCategory, CATEGORY_CONFIG } from "@/hooks/useTasks";
import { TaskCard } from "./TaskCard";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ClipboardList, CheckCircle2, Clock, Trophy, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function StudentTasksDashboard() {
  const { tasks, isLoading, updateTaskStatus } = useTasks();
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | "all">("all");

  const filteredTasks = tasks.filter(t => 
    categoryFilter === "all" || t.category === categoryFilter
  );

  const pendingTasks = filteredTasks.filter(t => t.status === "pendente");
  const completedTasks = filteredTasks.filter(t => t.status === "concluida");
  const overdueTasks = pendingTasks.filter(t => 
    t.due_date && new Date(t.due_date) < new Date()
  );

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

            <TabsContent value="pending" className="mt-4 space-y-3" role="tabpanel" aria-label="Lista de tarefas pendentes">
              {pendingTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" role="status" aria-live="polite">
                  <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
                  <p>Nenhuma tarefa pendente!</p>
                  <p className="text-sm">Continue assim! 🥋</p>
                </div>
              ) : (
                <ul className="space-y-3" aria-label="Tarefas pendentes">
                  {pendingTasks.map(task => (
                    <li key={task.id}>
                      <TaskCard
                        task={task}
                        onStatusChange={handleStatusChange}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-4 space-y-3" role="tabpanel" aria-label="Lista de tarefas concluídas">
              {completedTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" role="status" aria-live="polite">
                  <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
                  <p>Nenhuma tarefa concluída ainda.</p>
                </div>
              ) : (
                <ul className="space-y-3" aria-label="Tarefas concluídas">
                  {completedTasks.map(task => (
                    <li key={task.id}>
                      <TaskCard
                        task={task}
                        onStatusChange={handleStatusChange}
                      />
                    </li>
                  ))}
                </ul>
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
              <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />
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

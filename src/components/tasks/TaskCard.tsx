import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Circle, Clock, AlertTriangle, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TaskWithAssignee, TaskStatus, TaskPriority, TaskCategory, CATEGORY_CONFIG } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: TaskWithAssignee;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onDelete?: (taskId: string) => void;
  showAssignee?: boolean;
}

const priorityConfig: Record<TaskPriority, { label: string; className: string }> = {
  baixa: { label: "Baixa", className: "bg-muted text-muted-foreground" },
  normal: { label: "Normal", className: "bg-primary/10 text-primary" },
  alta: { label: "Alta", className: "bg-destructive/10 text-destructive" },
};

export function TaskCard({ task, onStatusChange, onDelete, showAssignee = false }: TaskCardProps) {
  const isCompleted = task.status === "concluida";
  const isCancelled = task.status === "cancelada";
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isCompleted && !isCancelled;
  const isDueToday = task.due_date && isToday(new Date(task.due_date));

  const handleToggleComplete = () => {
    onStatusChange(task.id, isCompleted ? "pendente" : "concluida");
  };

  return (
    <Card 
      className={cn(
        "transition-all duration-200 hover:shadow-md focus-within:ring-2 focus-within:ring-ring",
        isCompleted && "opacity-60",
        isCancelled && "opacity-40"
      )}
      role="article"
      aria-label={`Tarefa: ${task.title}${isCompleted ? ", concluída" : ""}${isOverdue ? ", atrasada" : ""}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <button
            onClick={handleToggleComplete}
            className="mt-0.5 flex-shrink-0 transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full"
            disabled={isCancelled}
            aria-label={isCompleted ? "Marcar como pendente" : "Marcar como concluída"}
            aria-pressed={isCompleted}
          >
            {isCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" aria-hidden="true" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className={cn(
                "font-medium text-foreground",
                isCompleted && "line-through text-muted-foreground"
              )}>
                {task.title}
              </h4>
              <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end" role="group" aria-label="Informações da tarefa">
                {task.category && CATEGORY_CONFIG[task.category] && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      CATEGORY_CONFIG[task.category].bgColor,
                      CATEGORY_CONFIG[task.category].color,
                      "border-0"
                    )}
                    aria-label={`Categoria: ${CATEGORY_CONFIG[task.category].label}`}
                  >
                    {CATEGORY_CONFIG[task.category].label}
                  </Badge>
                )}
                <Badge 
                  variant="outline" 
                  className={priorityConfig[task.priority].className}
                  aria-label={`Prioridade: ${priorityConfig[task.priority].label}`}
                >
                  {priorityConfig[task.priority].label}
                </Badge>
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => onDelete(task.id)}
                    aria-label={`Excluir tarefa: ${task.title}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </div>

            {task.description && (
              <p className={cn(
                "text-sm text-muted-foreground mt-1",
                isCompleted && "line-through"
              )}>
                {task.description}
              </p>
            )}

            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground" role="contentinfo">
              {task.due_date && (
                <span className={cn(
                  "flex items-center gap-1",
                  isOverdue && "text-destructive",
                  isDueToday && !isCompleted && "text-warning"
                )}>
                  {isOverdue ? (
                    <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <Clock className="h-3 w-3" aria-hidden="true" />
                  )}
                  <time dateTime={task.due_date}>
                    {format(new Date(task.due_date), "dd/MM/yyyy", { locale: ptBR })}
                  </time>
                  {isDueToday && <span aria-label="Vence hoje"> (Hoje)</span>}
                  {isOverdue && <span role="alert"> (Atrasada)</span>}
                </span>
              )}

              {showAssignee && (
                <span className="text-muted-foreground">
                  Para: {task.assignee_name}
                </span>
              )}

              <span className="text-muted-foreground">
                Por: {task.assigner_name}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

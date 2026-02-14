import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Circle, Clock, AlertTriangle, Trash2, Youtube } from "lucide-react";
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
  videoUrl?: string;
}

const priorityConfig: Record<TaskPriority, { label: string; className: string }> = {
  baixa: { label: "Baixa", className: "bg-muted text-muted-foreground" },
  normal: { label: "Normal", className: "bg-primary/10 text-primary" },
  alta: { label: "Alta", className: "bg-destructive/10 text-destructive" },
};

export function TaskCard({ task, onStatusChange, onDelete, showAssignee = false, videoUrl }: TaskCardProps) {
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
        "transition-all duration-200 hover:shadow-md group overflow-hidden",
        isCompleted && "opacity-60",
        isCancelled && "opacity-40",
        isOverdue && "border-destructive/30"
      )}
      role="article"
      aria-label={`Tarefa: ${task.title}${isCompleted ? ", concluída" : ""}${isOverdue ? ", atrasada" : ""}`}
    >
      {/* Status accent bar */}
      <div className={cn(
        "h-0.5 w-full",
        isCompleted ? "bg-success" : isOverdue ? "bg-destructive" : isDueToday ? "bg-warning" : "bg-primary/30"
      )} />
      
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <button
            onClick={handleToggleComplete}
            className={cn(
              "mt-0.5 flex-shrink-0 transition-all duration-200 rounded-full p-0.5",
              "hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isCompleted ? "text-success" : "text-muted-foreground hover:text-primary"
            )}
            disabled={isCancelled}
            aria-label={isCompleted ? "Marcar como pendente" : "Marcar como concluída"}
            aria-pressed={isCompleted}
          >
            {isCompleted ? (
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Circle className="h-5 w-5" aria-hidden="true" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className={cn(
                "font-medium text-sm text-foreground leading-tight",
                isCompleted && "line-through text-muted-foreground"
              )}>
                {task.title}
              </h4>
              <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end" role="group" aria-label="Informações da tarefa">
                {task.category && CATEGORY_CONFIG[task.category] && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px] px-1.5 py-0",
                      CATEGORY_CONFIG[task.category].bgColor,
                      CATEGORY_CONFIG[task.category].color,
                      "border-0"
                    )}
                  >
                    {CATEGORY_CONFIG[task.category].label}
                  </Badge>
                )}
                <Badge 
                  variant="outline" 
                  className={cn("text-[10px] px-1.5 py-0", priorityConfig[task.priority].className)}
                >
                  {priorityConfig[task.priority].label}
                </Badge>
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                    onClick={() => onDelete(task.id)}
                    aria-label={`Excluir tarefa: ${task.title}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </div>

            {task.description && (
              <p className={cn(
                "text-xs text-muted-foreground mt-1 leading-relaxed",
                isCompleted && "line-through"
              )}>
                {task.description}
              </p>
            )}

            {videoUrl && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-xs text-destructive hover:text-destructive/80 font-medium transition-colors bg-destructive/5 px-2.5 py-1 rounded-md"
              >
                <Youtube className="h-3.5 w-3.5" />
                Assistir vídeo
              </a>
            )}

            <div className="flex items-center gap-3 mt-2.5 text-[11px] text-muted-foreground" role="contentinfo">
              {task.due_date && (
                <span className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full",
                  isOverdue && "text-destructive bg-destructive/10",
                  isDueToday && !isCompleted && "text-warning bg-warning/10",
                  !isOverdue && !isDueToday && "bg-muted/50"
                )}>
                  {isOverdue ? (
                    <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                  ) : (
                    <Clock className="h-3 w-3" aria-hidden="true" />
                  )}
                  <time dateTime={task.due_date}>
                    {format(new Date(task.due_date), "dd/MM/yyyy", { locale: ptBR })}
                  </time>
                  {isDueToday && <span> (Hoje)</span>}
                  {isOverdue && <span role="alert"> (Atrasada)</span>}
                </span>
              )}

              {showAssignee && (
                <span>Para: {task.assignee_name}</span>
              )}

              <span>Por: {task.assigner_name}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

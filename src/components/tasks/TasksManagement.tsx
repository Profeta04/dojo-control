import { useState, useMemo } from "react";
import { useTasks, TaskCategory, CATEGORY_CONFIG } from "@/hooks/useTasks";
import { TaskCard } from "./TaskCard";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ClipboardList, Users, CheckCircle2, Clock, AlertTriangle, Filter, Trash2, UserX, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export function TasksManagement() {
  const { tasks, isLoading, updateTaskStatus, deleteTask, deleteBatchTasks, deleteTasksByStudent } = useTasks();
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | "all">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);
  const [showStudentDeleteDialog, setShowStudentDeleteDialog] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  // Unique students from tasks
  const students = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach(t => {
      if (!map.has(t.assigned_to)) map.set(t.assigned_to, t.assignee_name || "Desconhecido");
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [tasks]);

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.assignee_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const pendingTasks = filteredTasks.filter(t => t.status === "pendente");
  const completedTasks = filteredTasks.filter(t => t.status === "concluida");
  const overdueTasks = pendingTasks.filter(t =>
    t.due_date && new Date(t.due_date) < new Date()
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (taskList: typeof filteredTasks) => {
    const allIds = taskList.map(t => t.id);
    const allSelected = allIds.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      allIds.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const handleStatusChange = async (taskId: string, status: "pendente" | "concluida" | "cancelada") => {
    try {
      await updateTaskStatus.mutateAsync({ taskId, status });
      toast.success(status === "concluida" ? "Tarefa marcada como concluída" : "Status atualizado");
    } catch {
      toast.error("Erro ao atualizar tarefa");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTaskId) return;
    try {
      await deleteTask.mutateAsync(deleteTaskId);
      toast.success("Tarefa excluída");
      setDeleteTaskId(null);
    } catch {
      toast.error("Erro ao excluir tarefa");
    }
  };

  const handleBatchDelete = async () => {
    try {
      await deleteBatchTasks.mutateAsync(Array.from(selectedIds));
      toast.success(`${selectedIds.size} tarefas excluídas`);
      setSelectedIds(new Set());
      setShowBatchDeleteDialog(false);
    } catch (err) {
      console.error("Erro ao excluir tarefas em lote:", err);
      toast.error("Erro ao excluir tarefas em lote");
    }
  };

  const handleStudentDelete = async () => {
    if (!selectedStudentId) return;
    try {
      await deleteTasksByStudent.mutateAsync(selectedStudentId);
      const name = students.find(([id]) => id === selectedStudentId)?.[1] || "aluno";
      toast.success(`Todas as tarefas de ${name} foram excluídas`);
      setSelectedStudentId("");
      setShowStudentDeleteDialog(false);
    } catch (err) {
      console.error("Erro ao excluir tarefas do aluno:", err);
      toast.error("Erro ao excluir tarefas do aluno");
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const renderTaskList = (taskList: typeof filteredTasks, emptyIcon: React.ReactNode, emptyText: string) => {
    if (taskList.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <div className="mx-auto mb-3 opacity-50">{emptyIcon}</div>
          <p>{emptyText}</p>
        </div>
      );
    }

    // Group tasks by student
    const grouped = new Map<string, { name: string; tasks: typeof taskList }>();
    taskList.forEach(task => {
      const key = task.assigned_to;
      if (!grouped.has(key)) {
        grouped.set(key, { name: task.assignee_name || "Desconhecido", tasks: [] });
      }
      grouped.get(key)!.tasks.push(task);
    });

    const sortedGroups = Array.from(grouped.entries()).sort((a, b) =>
      a[1].name.localeCompare(b[1].name)
    );

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1 mb-2">
          <Checkbox
            checked={taskList.every(t => selectedIds.has(t.id))}
            onCheckedChange={() => toggleSelectAll(taskList)}
            aria-label="Selecionar todos"
          />
          <span className="text-xs text-muted-foreground">Selecionar todos</span>
        </div>

        {sortedGroups.map(([studentId, group]) => {
          const studentCompleted = group.tasks.filter(t => t.status === "concluida").length;
          const studentTotal = group.tasks.length;
          const allStudentSelected = group.tasks.every(t => selectedIds.has(t.id));

          return (
            <Collapsible key={studentId} defaultOpen={sortedGroups.length <= 5}>
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="pl-3" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={allStudentSelected}
                    onCheckedChange={() => {
                      const ids = group.tasks.map(t => t.id);
                      setSelectedIds(prev => {
                        const next = new Set(prev);
                        ids.forEach(id => allStudentSelected ? next.delete(id) : next.add(id));
                        return next;
                      });
                    }}
                    aria-label={`Selecionar todas de ${group.name}`}
                  />
                </div>
                <CollapsibleTrigger className="flex items-center justify-between flex-1 p-3 pl-0 group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{group.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {studentCompleted}/{studentTotal}
                    </Badge>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="pl-4 pt-2 space-y-2">
                {group.tasks.map(task => (
                  <div key={task.id} className="flex items-start gap-2">
                    <Checkbox
                      checked={selectedIds.has(task.id)}
                      onCheckedChange={() => toggleSelect(task.id)}
                      className="mt-4"
                      aria-label={`Selecionar ${task.title}`}
                    />
                    <div className="flex-1 min-w-0">
                      <TaskCard
                        task={task}
                        onStatusChange={handleStatusChange}
                        onDelete={(id) => setDeleteTaskId(id)}
                        showAssignee={false}
                      />
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Gerenciar Questões
        </h2>
        <p className="text-sm text-muted-foreground">
          Acompanhe o progresso dos alunos nas questões
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            <ClipboardList className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{tasks.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{pendingTasks.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Atrasadas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{overdueTasks.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Concluídas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{completedTasks.length}</div></CardContent>
        </Card>
      </div>

      {/* Bulk Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        <Input
          placeholder="Buscar por título ou aluno..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Badge
            variant={categoryFilter === "all" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setCategoryFilter("all")}
          >
            Todas
          </Badge>
          {(Object.keys(CATEGORY_CONFIG) as TaskCategory[]).map((cat) => (
            <Badge
              key={cat}
              variant="outline"
              className={cn(
                "cursor-pointer transition-colors",
                categoryFilter === cat 
                  ? cn(CATEGORY_CONFIG[cat].bgColor, CATEGORY_CONFIG[cat].color, "border-0")
                  : "hover:bg-muted"
              )}
              onClick={() => setCategoryFilter(cat)}
            >
              {CATEGORY_CONFIG[cat].label}
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowBatchDeleteDialog(true)}
              className="gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Excluir {selectedIds.size} selecionada{selectedIds.size > 1 ? "s" : ""}
            </Button>
          )}

          <Select value={selectedStudentId} onValueChange={(val) => {
            setSelectedStudentId(val);
            setShowStudentDeleteDialog(true);
          }}>
            <SelectTrigger className="w-auto min-w-[200px] h-9 text-sm">
              <div className="flex items-center gap-1.5">
                <UserX className="h-4 w-4 text-destructive" />
                <SelectValue placeholder="Excluir por aluno..." />
              </div>
            </SelectTrigger>
            <SelectContent>
              {students.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name} ({tasks.filter(t => t.assigned_to === id).length} tarefas)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tasks List */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pendentes ({pendingTasks.length})
              </TabsTrigger>
              <TabsTrigger value="overdue" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Atrasadas ({overdueTasks.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Concluídas ({completedTasks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4">
              {renderTaskList(pendingTasks, <ClipboardList className="h-12 w-12 mx-auto" />, "Nenhuma tarefa pendente")}
            </TabsContent>

            <TabsContent value="overdue" className="mt-4">
              {renderTaskList(overdueTasks, <CheckCircle2 className="h-12 w-12 mx-auto" />, "Nenhuma tarefa atrasada!")}
            </TabsContent>

            <TabsContent value="completed" className="mt-4">
              {renderTaskList(completedTasks, <Users className="h-12 w-12 mx-auto" />, "Nenhuma tarefa concluída ainda")}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Single Delete Confirmation */}
      <AlertDialog open={!!deleteTaskId} onOpenChange={() => setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Delete Confirmation */}
      <AlertDialog open={showBatchDeleteDialog} onOpenChange={setShowBatchDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.size} Tarefas</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedIds.size} tarefa{selectedIds.size > 1 ? "s" : ""} selecionada{selectedIds.size > 1 ? "s" : ""}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir {selectedIds.size} Tarefa{selectedIds.size > 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Student Delete Confirmation */}
      <AlertDialog open={showStudentDeleteDialog} onOpenChange={(open) => {
        setShowStudentDeleteDialog(open);
        if (!open) setSelectedStudentId("");
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Tarefas do Aluno</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>todas</strong> as tarefas de{" "}
              <strong>{students.find(([id]) => id === selectedStudentId)?.[1]}</strong>?
              Isso inclui {tasks.filter(t => t.assigned_to === selectedStudentId).length} tarefas. 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStudentDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

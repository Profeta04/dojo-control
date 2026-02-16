import { useState, useMemo } from "react";
import { useTasks } from "@/hooks/useTasks";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ClipboardList, Users, CheckCircle2, TrendingUp, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function TasksManagement() {
  const { tasks, isLoading } = useTasks();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch total template count for progress calculation
  const { data: totalTemplates = 0 } = useQuery({
    queryKey: ["total-templates-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("task_templates")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  // Group tasks by student
  const studentProgress = useMemo(() => {
    const grouped = new Map<string, { name: string; completed: number }>();
    tasks.forEach(task => {
      if (task.status !== "concluida") return;
      const key = task.assigned_to;
      if (!grouped.has(key)) {
        grouped.set(key, { name: task.assignee_name || "Desconhecido", completed: 0 });
      }
      grouped.get(key)!.completed++;
    });

    return Array.from(grouped.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        completed: data.completed,
        percent: totalTemplates > 0 ? Math.round((data.completed / totalTemplates) * 100) : 0,
      }))
      .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks, totalTemplates, searchTerm]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Progresso dos Alunos
        </h2>
        <p className="text-sm text-muted-foreground">
          Acompanhe o progresso dos alunos nas questões
        </p>
      </div>

      {/* Search */}
      <Input
        placeholder="Buscar aluno..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-sm"
      />

      {/* Student Progress List */}
      {studentProgress.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum aluno encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {studentProgress.map((student) => (
            <Card key={student.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{student.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="font-semibold">{student.completed}</span>
                      <span className="text-muted-foreground">acertos</span>
                    </div>
                    <Badge variant="outline" className="text-xs font-semibold">
                      {student.percent}%
                    </Badge>
                  </div>
                </div>
                <Progress value={student.percent} className="h-1.5" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

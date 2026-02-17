import { useState, useMemo } from "react";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Users, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDojoContext } from "@/hooks/useDojoContext";

export function TasksManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const { currentDojoId } = useDojoContext();

  // Fetch all students in the dojo
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["dojo-students-progress", currentDojoId],
    queryFn: async () => {
      if (!currentDojoId) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name")
        .eq("dojo_id", currentDojoId)
        .eq("registration_status", "aprovado");
      if (error) throw error;

      // Filter only students (exclude staff)
      const studentIds = (data || []).map(p => p.user_id);
      if (studentIds.length === 0) return [];

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", studentIds);

      const staffIds = new Set(
        (roles || []).filter(r => ["admin", "dono", "sensei"].includes(r.role)).map(r => r.user_id)
      );

      return (data || []).filter(p => !staffIds.has(p.user_id));
    },
    enabled: !!currentDojoId,
  });

  // Fetch total template count
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

  // Fetch completed task counts per student
  const studentIds = students.map(s => s.user_id);
  const { data: completedMap = new Map<string, number>(), isLoading: loadingTasks } = useQuery({
    queryKey: ["student-completed-counts", studentIds],
    queryFn: async () => {
      if (studentIds.length === 0) return new Map<string, number>();
      const map = new Map<string, number>();
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("tasks")
          .select("assigned_to")
          .eq("status", "concluida")
          .in("assigned_to", studentIds)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (data) data.forEach(t => map.set(t.assigned_to, (map.get(t.assigned_to) || 0) + 1));
        if (!data || data.length < PAGE) break;
        from += PAGE;
      }
      return map;
    },
    enabled: studentIds.length > 0,
  });

  const studentProgress = useMemo(() => {
    return students
      .map(s => {
        const completed = completedMap.get(s.user_id) || 0;
        return {
          id: s.user_id,
          name: s.name,
          completed,
          percent: totalTemplates > 0 ? Math.round((completed / totalTemplates) * 100) : 0,
        };
      })
      .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, completedMap, totalTemplates, searchTerm]);

  const isLoading = loadingStudents || loadingTasks;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">

      <Input
        placeholder="Buscar aluno..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-sm"
      />

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

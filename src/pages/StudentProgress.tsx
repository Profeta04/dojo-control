import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDojoContext } from "@/hooks/useDojoContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, TrendingUp, CheckCircle2, ClipboardList, Users } from "lucide-react";

export default function StudentProgress() {
  const { loading: authLoading } = useAuth();
  const { currentDojoId } = useDojoContext();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["student-progress", currentDojoId],
    queryFn: async () => {
      if (!currentDojoId) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, belt_grade")
        .eq("dojo_id", currentDojoId)
        .eq("registration_status", "aprovado");

      if (!profiles || profiles.length === 0) return [];

      const studentIds = profiles.map(p => p.user_id);

      const [tasksRes, xpRes] = await Promise.all([
        supabase.from("tasks").select("assigned_to, status").in("assigned_to", studentIds),
        supabase.from("student_xp").select("user_id, total_xp, level").in("user_id", studentIds),
      ]);

      const tasks = tasksRes.data || [];
      const xpList = xpRes.data || [];
      const xpMap = new Map(xpList.map(x => [x.user_id, x]));

      return profiles.map(p => {
        const studentTasks = tasks.filter(t => t.assigned_to === p.user_id);
        const completed = studentTasks.filter(t => t.status === "concluida").length;
        const total = studentTasks.length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        const xp = xpMap.get(p.user_id);

        return {
          ...p,
          completed,
          total,
          rate,
          total_xp: xp?.total_xp || 0,
          level: xp?.level || 1,
        };
      }).sort((a, b) => b.rate - a.rate || b.total_xp - a.total_xp);
    },
    enabled: !!currentDojoId,
  });

  if (authLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  const students = data || [];
  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const avgRate = students.length > 0
    ? Math.round(students.reduce((sum, s) => sum + s.rate, 0) / students.length)
    : 0;
  const totalCompleted = students.reduce((sum, s) => sum + s.completed, 0);

  return (
    <DashboardLayout>
      <PageHeader
        title="Progresso dos Alunos"
        description="Acompanhe o desempenho dos alunos nas tarefas"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <Users className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{students.length}</p>
              <p className="text-[11px] text-muted-foreground">Alunos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgRate}%</p>
              <p className="text-[11px] text-muted-foreground">Média conclusão</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCompleted}</p>
              <p className="text-[11px] text-muted-foreground">Acertos totais</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar aluno..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Student List */}
      <div className="mt-4 space-y-2">
        {isLoading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground">
                {!currentDojoId ? "Selecione um dojo para ver o progresso" : "Nenhum aluno encontrado"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((student) => {
            const publicUrl = student.avatar_url
              ? supabase.storage.from("avatars").getPublicUrl(student.avatar_url).data.publicUrl
              : null;

            return (
              <Card key={student.user_id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={publicUrl || undefined} />
                      <AvatarFallback className="text-xs font-bold bg-primary/10">
                        {student.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{student.name}</p>
                        {student.belt_grade && (
                          <BeltBadge grade={student.belt_grade as any} size="sm" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={student.rate} className="h-2 flex-1" />
                        <span className="text-xs font-semibold text-muted-foreground w-10 text-right">
                          {student.rate}%
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[11px] text-muted-foreground">
                          {student.completed}/{student.total} tarefas
                        </span>
                        <span className="text-[11px] text-accent font-medium">
                          Nv.{student.level} • {student.total_xp} XP
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
}

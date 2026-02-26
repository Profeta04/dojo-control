import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDojoContext } from "@/hooks/useDojoContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, TrendingUp, CheckCircle2, ClipboardList, Users, Filter } from "lucide-react";

const MARTIAL_ART_LABELS: Record<string, string> = {
  judo: "Judô",
  bjj: "Jiu-Jitsu",
  "jiu-jitsu": "Jiu-Jitsu",
};

// Normalize martial art identifiers so bjj and jiu-jitsu are treated as one
function normalizeArt(art: string): string {
  if (art === "jiu-jitsu") return "bjj";
  return art;
}

// Get all DB identifiers that map to a normalized art
function artVariants(normalized: string): string[] {
  if (normalized === "bjj") return ["bjj", "jiu-jitsu"];
  return [normalized];
}

export default function StudentProgress() {
  const { loading: authLoading } = useAuth();
  const { currentDojoId } = useDojoContext();
  const [search, setSearch] = useState("");
  const [filterArt, setFilterArt] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["student-progress", currentDojoId],
    queryFn: async () => {
      if (!currentDojoId) return { students: [], martialArts: [] as string[] };

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, belt_grade")
        .eq("dojo_id", currentDojoId)
        .eq("registration_status", "aprovado");

      if (!profiles || profiles.length === 0) return { students: [], martialArts: [] };

      const studentIds = profiles.map(p => p.user_id);

      // Get each student's martial arts via class enrollment
      const { data: enrollments } = await supabase
        .from("class_students")
        .select("student_id, class_id, classes(martial_art)")
        .in("student_id", studentIds);

      const studentArts = new Map<string, Set<string>>();
      const allArts = new Set<string>();
      (enrollments || []).forEach((e: any) => {
        const ma = normalizeArt(e.classes?.martial_art || "judo");
        if (!studentArts.has(e.student_id)) studentArts.set(e.student_id, new Set());
        studentArts.get(e.student_id)!.add(ma);
        allArts.add(ma);
      });

      // Count total templates per normalized martial art (bjj includes jiu-jitsu)
      const templateCounts = new Map<string, number>();
      for (const ma of allArts) {
        let total = 0;
        for (const variant of artVariants(ma)) {
          const { count } = await supabase
            .from("task_templates")
            .select("id", { count: "exact", head: true })
            .eq("martial_art", variant);
          total += count || 0;
        }
        templateCounts.set(ma, total);
      }

      // Get all template titles per normalized martial art
      const templateTitlesByArt = new Map<string, Set<string>>();
      for (const ma of allArts) {
        const titles = new Set<string>();
        for (const variant of artVariants(ma)) {
          let from = 0;
          const PAGE = 1000;
          while (true) {
            const { data: tData } = await supabase
              .from("task_templates")
              .select("title")
              .eq("martial_art", variant)
              .range(from, from + PAGE - 1);
            if (tData) tData.forEach(t => titles.add(t.title));
            if (!tData || tData.length < PAGE) break;
            from += PAGE;
          }
        }
        templateTitlesByArt.set(ma, titles);
      }

      // Get completed tasks per student
      const { data: tasks } = await supabase
        .from("tasks")
        .select("assigned_to, title, status")
        .in("assigned_to", studentIds)
        .eq("status", "concluida");

      const completedByStudent = new Map<string, Set<string>>();
      (tasks || []).forEach(t => {
        if (!completedByStudent.has(t.assigned_to)) completedByStudent.set(t.assigned_to, new Set());
        completedByStudent.get(t.assigned_to)!.add(t.title);
      });

      const [xpRes] = await Promise.all([
        supabase.from("student_xp").select("user_id, total_xp, level").in("user_id", studentIds),
      ]);
      const xpMap = new Map((xpRes.data || []).map(x => [x.user_id, x]));

      // Fetch student_belts
      const { data: beltsData } = await supabase
        .from("student_belts")
        .select("user_id, martial_art, belt_grade")
        .in("user_id", studentIds);

      const beltsMap = new Map<string, { martial_art: string; belt_grade: string }[]>();
      (beltsData || []).forEach(b => {
        if (!beltsMap.has(b.user_id)) beltsMap.set(b.user_id, []);
        beltsMap.get(b.user_id)!.push(b);
      });

      const studentResults = profiles.map(p => {
        const arts = studentArts.get(p.user_id) || new Set<string>();
        const completedTitles = completedByStudent.get(p.user_id) || new Set<string>();
        const xp = xpMap.get(p.user_id);
        const belts = beltsMap.get(p.user_id) || [];

        // Calculate per-art progress
        const artProgress: { martial_art: string; completed: number; total: number; rate: number }[] = [];
        let totalCompleted = 0;
        let totalAll = 0;

        for (const ma of arts) {
          const artTitles = templateTitlesByArt.get(ma) || new Set();
          const total = artTitles.size;
          let completed = 0;
          artTitles.forEach(title => { if (completedTitles.has(title)) completed++; });
          artProgress.push({ martial_art: ma, completed, total, rate: total > 0 ? Math.round((completed / total) * 100) : 0 });
          totalCompleted += completed;
          totalAll += total;
        }

        return {
          ...p,
          martial_arts: [...arts],
          belts,
          artProgress,
          completed: totalCompleted,
          total: totalAll,
          rate: totalAll > 0 ? Math.round((totalCompleted / totalAll) * 100) : 0,
          total_xp: xp?.total_xp || 0,
          level: xp?.level || 1,
        };
      }).sort((a, b) => b.rate - a.rate || b.total_xp - a.total_xp);

      return { students: studentResults, martialArts: [...allArts] };
    },
    enabled: !!currentDojoId,
  });

  if (authLoading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  const students = data?.students || [];
  const availableArts = data?.martialArts || [];

  // Filter by search and martial art
  const filtered = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchesArt = filterArt === "all" || s.martial_arts.includes(filterArt);
    return matchesSearch && matchesArt;
  });

  // Recalculate stats based on filter
  const getFilteredProgress = (student: typeof students[0]) => {
    if (filterArt === "all") return { completed: student.completed, total: student.total, rate: student.rate };
    const artP = student.artProgress.find(a => a.martial_art === filterArt);
    return artP || { completed: 0, total: 0, rate: 0 };
  };

  const avgRate = filtered.length > 0
    ? Math.round(filtered.reduce((sum, s) => sum + getFilteredProgress(s).rate, 0) / filtered.length)
    : 0;
  const totalCompleted = filtered.reduce((sum, s) => sum + getFilteredProgress(s).completed, 0);

  return (
    <DashboardLayout>
      <PageHeader title="Progresso dos Alunos" description="Acompanhe o desempenho dos alunos nas tarefas" />

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10"><Users className="h-5 w-5 text-accent" /></div>
            <div><p className="text-2xl font-bold">{filtered.length}</p><p className="text-[11px] text-muted-foreground">Alunos</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{avgRate}%</p><p className="text-[11px] text-muted-foreground">Média conclusão</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10"><CheckCircle2 className="h-5 w-5 text-success" /></div>
            <div><p className="text-2xl font-bold">{totalCompleted}</p><p className="text-[11px] text-muted-foreground">Acertos totais</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2 mt-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar aluno..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {availableArts.length > 1 && (
          <Select value={filterArt} onValueChange={setFilterArt}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {availableArts.map(art => (
                <SelectItem key={art} value={art}>{MARTIAL_ART_LABELS[art] || art}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
            const fp = getFilteredProgress(student);

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
                        {student.belts.length > 0 ? (
                          <div className="flex gap-1">
                            {student.belts
                              .filter(b => filterArt === "all" || b.martial_art === filterArt)
                              .map(b => (
                                <BeltBadge key={b.martial_art} grade={b.belt_grade as any} size="sm" />
                              ))}
                          </div>
                        ) : student.belt_grade ? (
                          <BeltBadge grade={student.belt_grade as any} size="sm" />
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={fp.rate} className="h-2 flex-1" />
                        <span className="text-xs font-semibold text-muted-foreground w-10 text-right">{fp.rate}%</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[11px] text-muted-foreground">{fp.completed}/{fp.total} tarefas</span>
                        <span className="text-[11px] text-accent font-medium">Nv.{student.level} • {student.total_xp} XP</span>
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

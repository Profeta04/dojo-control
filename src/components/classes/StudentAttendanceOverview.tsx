import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDojoContext } from "@/hooks/useDojoContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Search, TrendingUp, TrendingDown, Activityity } from "lucide-react";
import { useState, useMemo } from "react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StudentAttendanceSummary {
  userId: string;
  name: string;
  total: number;
  present: number;
  absent: number;
  percentage: number;
  currentStreak: number;
  lastAttendance: string | null;
}

export function StudentAttendanceOverview() {
  const { currentDojoId } = useDojoContext();
  const [search, setSearch] = useState("");

  const { data: summaries, isLoading } = useQuery({
    queryKey: ["staff-attendance-overview", currentDojoId],
    queryFn: async (): Promise<StudentAttendanceSummary[]> => {
      // 1. Get approved students from dojo (exclude staff)
      const { data: students, error: sErr } = await supabase
        .from("profiles")
        .select("user_id, name")
        .eq("registration_status", "aprovado")
        .eq("dojo_id", currentDojoId!);
      if (sErr) throw sErr;
      if (!students?.length) return [];

      // Filter out staff
      const { data: staffRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "dono", "sensei", "super_admin"]);
      const staffIds = new Set((staffRoles || []).map(r => r.user_id));
      const filteredStudents = students.filter(s => !staffIds.has(s.user_id));

      if (!filteredStudents.length) return [];

      // 2. Get all attendance for these students
      const studentIds = filteredStudents.map(s => s.user_id);
      const { data: attendance, error: aErr } = await supabase
        .from("attendance")
        .select("student_id, date, present")
        .in("student_id", studentIds)
        .order("date", { ascending: false });
      if (aErr) throw aErr;

      // 3. Group by student
      const byStudent = new Map<string, Array<{ date: string; present: boolean }>>();
      for (const a of attendance || []) {
        if (!byStudent.has(a.student_id)) byStudent.set(a.student_id, []);
        byStudent.get(a.student_id)!.push({ date: a.date, present: a.present });
      }

      return filteredStudents.map(s => {
        const records = byStudent.get(s.user_id) || [];
        const total = records.length;
        const present = records.filter(r => r.present === true).length;
        const absent = Math.max(0, total - present);
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

        // Current streak (only count consecutive presents from most recent)
        let currentStreak = 0;
        for (const r of records) {
          if (r.present === true) currentStreak++;
          else break;
        }

        const lastAttendance = records.length > 0 ? records[0].date : null;

        return {
          userId: s.user_id,
          name: s.name,
          total,
          present,
          absent,
          percentage: Math.max(0, Math.min(100, percentage)),
          currentStreak: Math.max(0, currentStreak),
          lastAttendance,
        };
      }).sort((a, b) => b.percentage - a.percentage);
    },
    enabled: !!currentDojoId,
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    if (!summaries) return [];
    if (!search.trim()) return summaries;
    const q = search.toLowerCase();
    return summaries.filter(s => s.name.toLowerCase().includes(q));
  }, [summaries, search]);

  const getPercentageBadge = (pct: number) => {
    if (pct >= 80) return <Badge className="bg-success/15 text-success border-success/20 font-bold">{pct}%</Badge>;
    if (pct >= 60) return <Badge className="bg-warning/15 text-warning border-warning/20 font-bold">{pct}%</Badge>;
    return <Badge className="bg-destructive/15 text-destructive border-destructive/20 font-bold">{pct}%</Badge>;
  };

  const getStreakIcon = (streak: number) => {
    if (streak >= 5) return <TrendingUp className="h-3.5 w-3.5 text-success" />;
    if (streak >= 1) return <Activity className="h-3.5 w-3.5 text-muted-foreground" />;
    return <TrendingDown className="h-3.5 w-3.5 text-destructive" />;
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 80) return "[&>div]:bg-success";
    if (pct >= 60) return "[&>div]:bg-warning";
    return "[&>div]:bg-destructive";
  };

  // Global average
  const globalAvg = useMemo(() => {
    if (!summaries?.length) return 0;
    const total = summaries.reduce((s, x) => s + x.percentage, 0);
    return Math.round(total / summaries.length);
  }, [summaries]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <Users className="h-5 w-5 text-primary" />
            Frequência por Aluno
          </CardTitle>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs whitespace-nowrap">
              Média geral: {globalAvg}%
            </Badge>
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar aluno..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">
            {summaries?.length === 0 ? "Nenhum aluno encontrado neste dojo." : "Nenhum aluno corresponde à busca."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead className="text-center w-24">Presença</TableHead>
                  <TableHead className="hidden sm:table-cell text-center w-20">Aulas</TableHead>
                  <TableHead className="hidden sm:table-cell text-center w-20">Presenças</TableHead>
                  <TableHead className="hidden md:table-cell text-center w-20">Faltas</TableHead>
                  <TableHead className="text-center w-20">Sequência</TableHead>
                  <TableHead className="hidden md:table-cell w-32">Progresso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(s => (
                  <TableRow key={s.userId}>
                    <TableCell className="font-medium text-sm max-w-[150px] truncate">
                      {s.name}
                    </TableCell>
                    <TableCell className="text-center">
                      {getPercentageBadge(s.percentage)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-center text-sm text-muted-foreground">
                      {s.total}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-center text-sm text-success font-medium">
                      {s.present}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-center text-sm text-destructive font-medium">
                      {s.absent}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1 text-sm">
                        {getStreakIcon(s.currentStreak)}
                        {s.currentStreak}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Progress value={s.percentage} className={`h-2 w-full ${getProgressColor(s.percentage)}`} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

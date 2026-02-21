import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { fetchLogoAsBase64 } from "@/lib/fetchLogoForPdf";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Loader2, Download } from "lucide-react";
import { generateStudentReport, StudentReportData } from "@/lib/generateStudentReport";
import { useDojoContext } from "@/hooks/useDojoContext";
import { FeatureGate } from "@/components/shared/FeatureGate";

export function StudentReportDialog() {
  const [open, setOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();
  const { currentDojoId, userDojos } = useDojoContext();

  // Fetch approved students filtered by dojo
  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ["approved-students-for-report", currentDojoId],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("user_id, name, email")
        .eq("registration_status", "aprovado")
        .order("name");

      if (currentDojoId) {
        query = query.eq("dojo_id", currentDojoId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const handleGenerateReport = async () => {
    if (!selectedStudentId) {
      toast({ title: "Selecione um aluno", description: "Escolha um aluno para gerar o relatório.", variant: "destructive" });
      return;
    }

    setGenerating(true);
    try {
      const currentDojo = userDojos.find((d) => d.id === currentDojoId) || userDojos[0];

      const { data: profile, error: profileError } = await supabase
        .from("profiles").select("*").eq("user_id", selectedStudentId).single();
      if (profileError) throw profileError;

      const [graduationsRes, attendanceRes, paymentsRes, xpRes, achievementsRes] = await Promise.all([
        supabase.from("graduation_history").select("from_belt, to_belt, graduation_date, notes")
          .eq("student_id", selectedStudentId).order("graduation_date", { ascending: false }),
        supabase.from("attendance").select("date, present, notes, classes (name)")
          .eq("student_id", selectedStudentId).order("date", { ascending: false }),
        supabase.from("payments").select("reference_month, amount, status, due_date, paid_date")
          .eq("student_id", selectedStudentId).order("due_date", { ascending: false }),
        supabase.from("student_xp").select("total_xp, level, current_streak, longest_streak")
          .eq("user_id", selectedStudentId).maybeSingle(),
        supabase.from("student_achievements").select("unlocked_at, achievements (name, rarity)")
          .eq("user_id", selectedStudentId).order("unlocked_at", { ascending: false }),
      ]);

      const xpData = xpRes.data;
      const achievementsList = (achievementsRes.data || []).map((sa: any) => ({
        name: sa.achievements?.name || "Conquista",
        rarity: sa.achievements?.rarity || "common",
        unlockedAt: sa.unlocked_at,
      }));

      const reportData: StudentReportData = {
        dojoInfo: {
          dojoName: currentDojo?.name || "Dojo",
          logoUrl: currentDojo?.logo_url,
          primaryColor: currentDojo?.color_primary,
          secondaryColor: currentDojo?.color_secondary,
          accentColor: currentDojo?.color_accent,
        },
        student: {
          name: profile.name,
          email: profile.email || "",
          phone: profile.phone,
          belt_grade: profile.belt_grade,
          birth_date: profile.birth_date,
          created_at: profile.created_at || new Date().toISOString(),
        },
        graduations: (graduationsRes.data || []).map((g: any) => ({
          previous_belt: g.from_belt,
          new_belt: g.to_belt,
          graduation_date: g.graduation_date,
          notes: g.notes,
        })),
        attendance: (attendanceRes.data || []).map((a: any) => ({
          date: a.date,
          class_name: a.classes?.name || "Turma não identificada",
          present: a.present,
          notes: a.notes,
        })),
        payments: paymentsRes.data || [],
        gamification: {
          totalXp: xpData?.total_xp || 0,
          level: xpData?.level || 1,
          currentStreak: xpData?.current_streak || 0,
          longestStreak: xpData?.longest_streak || 0,
          achievements: achievementsList,
        },
      };

      const logoBase64 = await fetchLogoAsBase64(currentDojo?.logo_url);
      const fileName = generateStudentReport(reportData, logoBase64);
      toast({ title: "Relatório gerado!", description: `O arquivo ${fileName} foi baixado.` });
      setOpen(false);
      setSelectedStudentId("");
    } catch (error) {
      console.error("Error generating report:", error);
      toast({ title: "Erro ao gerar relatório", description: "Ocorreu um erro ao buscar os dados do aluno.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <FeatureGate feature="pdf_reports" hideIfBlocked>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          Relatório Individual
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gerar Relatório Individual
          </DialogTitle>
          <DialogDescription>
            Selecione um aluno para gerar um PDF com seu histórico completo: graduações, presenças, pagamentos e pontos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Aluno</label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId} disabled={loadingStudents}>
              <SelectTrigger>
                <SelectValue placeholder={loadingStudents ? "Carregando..." : "Selecione um aluno"} />
              </SelectTrigger>
              <SelectContent>
                {students?.map((student) => (
                  <SelectItem key={student.user_id} value={student.user_id}>{student.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerateReport} disabled={!selectedStudentId || generating} className="w-full gap-2">
            {generating ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Gerando...</>
            ) : (
              <><Download className="h-4 w-4" />Gerar PDF</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </FeatureGate>
  );
}

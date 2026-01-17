import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Loader2, Download } from "lucide-react";
import { generateStudentReport, StudentReportData } from "@/lib/generateStudentReport";

export function StudentReportDialog() {
  const [open, setOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  // Fetch approved students
  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ["approved-students-for-report"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, name, email")
        .eq("registration_status", "aprovado")
        .order("name");

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const handleGenerateReport = async () => {
    if (!selectedStudentId) {
      toast({
        title: "Selecione um aluno",
        description: "Escolha um aluno para gerar o relatório.",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);

    try {
      // Fetch student profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", selectedStudentId)
        .single();

      if (profileError) throw profileError;

      // Fetch graduations
      const { data: graduations } = await supabase
        .from("graduation_history")
        .select("previous_belt, new_belt, graduation_date, notes")
        .eq("student_id", selectedStudentId)
        .order("graduation_date", { ascending: false });

      // Fetch attendance with class names
      const { data: attendance } = await supabase
        .from("attendance")
        .select(`
          date,
          present,
          notes,
          classes (name)
        `)
        .eq("student_id", selectedStudentId)
        .order("date", { ascending: false });

      // Fetch payments
      const { data: payments } = await supabase
        .from("payments")
        .select("reference_month, amount, status, due_date, paid_date")
        .eq("student_id", selectedStudentId)
        .order("due_date", { ascending: false });

      // Fetch tasks
      const { data: tasks } = await supabase
        .from("tasks")
        .select("title, description, status, priority, due_date, completed_at")
        .eq("assigned_to", selectedStudentId)
        .order("created_at", { ascending: false });

      const reportData: StudentReportData = {
        student: {
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          belt_grade: profile.belt_grade,
          birth_date: profile.birth_date,
          created_at: profile.created_at,
        },
        graduations: graduations || [],
        attendance: (attendance || []).map((a: any) => ({
          date: a.date,
          class_name: a.classes?.name || "Turma não identificada",
          present: a.present,
          notes: a.notes,
        })),
        payments: payments || [],
        tasks: tasks || [],
      };

      const fileName = generateStudentReport(reportData);

      toast({
        title: "Relatório gerado!",
        description: `O arquivo ${fileName} foi baixado.`,
      });

      setOpen(false);
      setSelectedStudentId("");
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Erro ao gerar relatório",
        description: "Ocorreu um erro ao buscar os dados do aluno.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
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
            Selecione um aluno para gerar um PDF com seu histórico completo: graduações, presenças, pagamentos e tarefas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Aluno</label>
            <Select
              value={selectedStudentId}
              onValueChange={setSelectedStudentId}
              disabled={loadingStudents}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingStudents ? "Carregando..." : "Selecione um aluno"} />
              </SelectTrigger>
              <SelectContent>
                {students?.map((student) => (
                  <SelectItem key={student.user_id} value={student.user_id}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGenerateReport}
            disabled={!selectedStudentId || generating}
            className="w-full gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Gerar PDF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FileDown, Loader2 } from "lucide-react";
import { generateDojoReport, DojoReportData } from "@/lib/generateDojoReport";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const BELT_LABELS: Record<string, string> = {
  branca: "Branca",
  cinza: "Cinza",
  azul: "Azul",
  amarela: "Amarela",
  laranja: "Laranja",
  verde: "Verde",
  roxa: "Roxa",
  marrom: "Marrom",
  preta_1dan: "Preta 1º Dan",
  preta_2dan: "Preta 2º Dan",
  preta_3dan: "Preta 3º Dan",
  preta_4dan: "Preta 4º Dan",
  preta_5dan: "Preta 5º Dan",
  preta_6dan: "Preta 6º Dan",
  preta_7dan: "Preta 7º Dan",
  preta_8dan: "Preta 8º Dan",
  preta_9dan: "Preta 9º Dan",
  preta_10dan: "Preta 10º Dan",
};

const STATUS_LABELS: Record<string, string> = {
  aprovado: "Aprovado",
  pendente: "Pendente",
  rejeitado: "Rejeitado",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pago: "Pago",
  pendente: "Pendente",
  atrasado: "Atrasado",
};

export function ExportReportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [includeStudents, setIncludeStudents] = useState(false);
  const [includeClasses, setIncludeClasses] = useState(false);
  const [includePayments, setIncludePayments] = useState(false);

  const handleExport = async () => {
    setIsGenerating(true);
    
    try {
      const now = new Date();
      const currentMonthStart = format(startOfMonth(now), "yyyy-MM-dd");
      const currentMonthEnd = format(endOfMonth(now), "yyyy-MM-dd");
      
      // Fetch base statistics
      const [
        studentsRes,
        classesRes,
        pendingRes,
        paymentsRes,
        senseisRes,
        attendanceRes,
        monthlyAttendanceRes,
        paidPaymentsRes,
        overduePaymentsRes,
        recentGraduationsRes
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact" }).eq("registration_status", "aprovado"),
        supabase.from("classes").select("id", { count: "exact" }).eq("is_active", true),
        supabase.from("profiles").select("id", { count: "exact" }).eq("registration_status", "pendente"),
        supabase.from("payments").select("id", { count: "exact" }).eq("status", "pendente"),
        supabase.from("user_roles").select("id", { count: "exact" }).eq("role", "sensei"),
        supabase.from("attendance").select("id, present", { count: "exact" })
          .gte("date", currentMonthStart).lte("date", currentMonthEnd),
        supabase.from("attendance").select("present, date")
          .gte("date", format(subMonths(now, 5), "yyyy-MM-dd")),
        supabase.from("payments").select("amount").eq("status", "pago"),
        supabase.from("payments").select("id", { count: "exact" }).eq("status", "atrasado"),
        supabase.from("graduation_history").select("id", { count: "exact" })
          .gte("graduation_date", format(subMonths(now, 3), "yyyy-MM-dd"))
      ]);

      // Calculate attendance stats
      const attendanceData = attendanceRes.data || [];
      const presentCount = attendanceData.filter(a => a.present).length;
      const totalAttendance = attendanceData.length;
      const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

      // Calculate monthly attendance
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthKey = format(monthDate, "yyyy-MM");
        const monthName = format(monthDate, "MMM", { locale: ptBR });
        
        const monthRecords = (monthlyAttendanceRes.data || []).filter(a => 
          a.date.startsWith(monthKey)
        );
        const monthPresent = monthRecords.filter(a => a.present).length;
        const monthTotal = monthRecords.length;
        
        monthlyData.push({
          name: monthName,
          presencas: monthPresent,
          total: monthTotal,
          taxa: monthTotal > 0 ? Math.round((monthPresent / monthTotal) * 100) : 0
        });
      }

      const totalReceived = (paidPaymentsRes.data || []).reduce((sum, p) => sum + (p.amount || 0), 0);

      const reportData: DojoReportData = {
        totalStudents: studentsRes.count || 0,
        activeClasses: classesRes.count || 0,
        pendingApprovals: pendingRes.count || 0,
        totalSenseis: senseisRes.count || 0,
        attendanceRate,
        presentCount,
        totalAttendance,
        monthlyAttendance: monthlyData,
        totalReceived,
        pendingPayments: paymentsRes.count || 0,
        overduePayments: overduePaymentsRes.count || 0,
        recentGraduations: recentGraduationsRes.count || 0,
      };

      // Optional: Fetch detailed lists
      if (includeStudents) {
        const { data: students } = await supabase
          .from("profiles")
          .select("name, email, belt_grade, registration_status")
          .order("name");
        
        reportData.studentsList = (students || []).map(s => ({
          name: s.name,
          email: s.email,
          belt: BELT_LABELS[s.belt_grade || "branca"] || s.belt_grade || "Não definida",
          status: STATUS_LABELS[s.registration_status || "pendente"] || s.registration_status || "Pendente",
        }));
      }

      if (includeClasses) {
        const { data: classes } = await supabase
          .from("classes")
          .select("id, name, schedule, sensei_id")
          .eq("is_active", true)
          .order("name");
        
        if (classes) {
          // Get sensei names
          const senseiIds = [...new Set(classes.map(c => c.sensei_id))];
          const { data: senseis } = await supabase
            .from("profiles")
            .select("user_id, name")
            .in("user_id", senseiIds);
          
          const senseiMap = new Map(senseis?.map(s => [s.user_id, s.name]) || []);
          
          // Get student counts
          const { data: enrollments } = await supabase
            .from("class_students")
            .select("class_id");
          
          const classStudentCounts = new Map<string, number>();
          (enrollments || []).forEach(e => {
            classStudentCounts.set(e.class_id, (classStudentCounts.get(e.class_id) || 0) + 1);
          });
          
          reportData.classesList = classes.map(c => ({
            name: c.name,
            schedule: c.schedule,
            sensei: senseiMap.get(c.sensei_id) || "Não definido",
            studentCount: classStudentCounts.get(c.id) || 0,
          }));
        }
      }

      if (includePayments) {
        const { data: payments } = await supabase
          .from("payments")
          .select("student_id, reference_month, amount, status, due_date")
          .order("due_date", { ascending: false })
          .limit(50);
        
        if (payments) {
          // Get student names
          const studentIds = [...new Set(payments.map(p => p.student_id))];
          const { data: students } = await supabase
            .from("profiles")
            .select("user_id, name")
            .in("user_id", studentIds);
          
          const studentMap = new Map(students?.map(s => [s.user_id, s.name]) || []);
          
          reportData.paymentsList = payments.map(p => ({
            studentName: studentMap.get(p.student_id) || "Desconhecido",
            referenceMonth: p.reference_month,
            amount: p.amount,
            status: PAYMENT_STATUS_LABELS[p.status] || p.status,
            dueDate: format(new Date(p.due_date), "dd/MM/yyyy"),
          }));
        }
      }

      // Generate the PDF
      const fileName = generateDojoReport(reportData);
      toast.success(`Relatório "${fileName}" gerado com sucesso!`);
      setIsOpen(false);
      
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Erro ao gerar relatório. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileDown className="h-4 w-4" />
          Exportar Relatório
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar Relatório em PDF</DialogTitle>
          <DialogDescription>
            Selecione as informações que deseja incluir no relatório.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground mb-4">
            O relatório sempre inclui as estatísticas gerais do dojo. Selecione abaixo para incluir listagens detalhadas:
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="students" 
              checked={includeStudents}
              onCheckedChange={(checked) => setIncludeStudents(checked === true)}
            />
            <Label htmlFor="students" className="cursor-pointer">
              Incluir lista de alunos
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="classes" 
              checked={includeClasses}
              onCheckedChange={(checked) => setIncludeClasses(checked === true)}
            />
            <Label htmlFor="classes" className="cursor-pointer">
              Incluir lista de turmas
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="payments" 
              checked={includePayments}
              onCheckedChange={(checked) => setIncludePayments(checked === true)}
            />
            <Label htmlFor="payments" className="cursor-pointer">
              Incluir últimos 50 pagamentos
            </Label>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 mr-2" />
                Gerar PDF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, CalendarDays, CreditCard, UserCheck, Clock } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading, profile, isAdmin, isSensei } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [studentsRes, classesRes, pendingRes, paymentsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact" }).eq("registration_status", "aprovado"),
        supabase.from("classes").select("id", { count: "exact" }).eq("is_active", true),
        supabase.from("profiles").select("id", { count: "exact" }).eq("registration_status", "pendente"),
        supabase.from("payments").select("id", { count: "exact" }).eq("status", "pendente"),
      ]);

      return {
        totalStudents: studentsRes.count || 0,
        activeClasses: classesRes.count || 0,
        pendingApprovals: pendingRes.count || 0,
        pendingPayments: paymentsRes.count || 0,
      };
    },
    enabled: !!user,
  });

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  const canManage = isAdmin || isSensei;

  return (
    <DashboardLayout>
      <PageHeader
        title={`Olá, ${profile?.name?.split(" ")[0] || "Judoca"}! 🥋`}
        description="Bem-vindo ao sistema de gestão do dojo"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alunos Ativos</CardTitle>
            <Users className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalStudents}</div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Turmas Ativas</CardTitle>
            <GraduationCap className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeClasses}</div>
          </CardContent>
        </Card>

        {canManage && (
          <>
            <Card className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Aprovações Pendentes</CardTitle>
                <Clock className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.pendingApprovals}</div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pagamentos Pendentes</CardTitle>
                <CreditCard className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.pendingPayments}</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="mt-8 p-6 bg-card rounded-lg border border-border">
        <h2 className="text-lg font-semibold mb-2">🎯 Próximos passos</h2>
        <p className="text-muted-foreground">
          {profile?.registration_status === "pendente" 
            ? "Seu cadastro está pendente de aprovação. Aguarde a confirmação de um Sensei."
            : canManage 
              ? "Use o menu lateral para gerenciar alunos, turmas, presenças e pagamentos."
              : "Explore o menu para ver suas turmas, agenda e histórico de graduações."}
        </p>
      </div>
    </DashboardLayout>
  );
}

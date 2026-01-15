import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, CalendarDays, CreditCard, UserCheck, Clock, UserCog, AlertCircle } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading, profile, isAdmin, isSensei, canManageStudents } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [studentsRes, classesRes, pendingRes, paymentsRes, senseisRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact" }).eq("registration_status", "aprovado"),
        supabase.from("classes").select("id", { count: "exact" }).eq("is_active", true),
        supabase.from("profiles").select("id", { count: "exact" }).eq("registration_status", "pendente"),
        supabase.from("payments").select("id", { count: "exact" }).eq("status", "pendente"),
        supabase.from("user_roles").select("id", { count: "exact" }).eq("role", "sensei"),
      ]);

      return {
        totalStudents: studentsRes.count || 0,
        activeClasses: classesRes.count || 0,
        pendingApprovals: pendingRes.count || 0,
        pendingPayments: paymentsRes.count || 0,
        totalSenseis: senseisRes.count || 0,
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

  const isPending = profile?.registration_status === "pendente";

  return (
    <DashboardLayout>
      <PageHeader
        title={`Olá, ${profile?.name?.split(" ")[0] || "Judoca"}! 🥋`}
        description="Bem-vindo ao sistema de gestão do dojo"
      />

      {/* Pending Approval Warning */}
      {isPending && (
        <div className="mb-6 p-4 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
          <div>
            <p className="font-medium text-foreground">Cadastro pendente de aprovação</p>
            <p className="text-sm text-muted-foreground">
              Seu cadastro está sendo analisado. Aguarde a confirmação de um Sensei para ter acesso completo ao sistema.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {canManageStudents && (
          <Link to="/students">
            <Card className="animate-fade-in hover:border-accent/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Alunos Ativos</CardTitle>
                <Users className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalStudents}</div>
              </CardContent>
            </Card>
          </Link>
        )}

        {isAdmin && (
          <Link to="/senseis">
            <Card className="animate-fade-in hover:border-accent/50 transition-colors cursor-pointer" style={{ animationDelay: "0.1s" }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Senseis</CardTitle>
                <UserCog className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalSenseis}</div>
              </CardContent>
            </Card>
          </Link>
        )}

        <Card className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Turmas Ativas</CardTitle>
            <GraduationCap className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeClasses}</div>
          </CardContent>
        </Card>

        {canManageStudents && (
          <>
            <Link to="/students">
              <Card className="animate-fade-in hover:border-warning/50 transition-colors cursor-pointer" style={{ animationDelay: "0.3s" }}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Aprovações Pendentes</CardTitle>
                  <Clock className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.pendingApprovals}</div>
                  {(stats?.pendingApprovals || 0) > 0 && (
                    <p className="text-xs text-warning mt-1">Clique para revisar</p>
                  )}
                </CardContent>
              </Card>
            </Link>

            <Link to="/payments">
              <Card className="animate-fade-in hover:border-warning/50 transition-colors cursor-pointer" style={{ animationDelay: "0.4s" }}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pagamentos Pendentes</CardTitle>
                  <CreditCard className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.pendingPayments}</div>
                </CardContent>
              </Card>
            </Link>
          </>
        )}
      </div>

      {!isPending && (
        <div className="mt-8 p-6 bg-card rounded-lg border border-border">
          <h2 className="text-lg font-semibold mb-2">🎯 Próximos passos</h2>
          <p className="text-muted-foreground">
            {canManageStudents 
              ? "Use o menu lateral para gerenciar alunos, turmas, presenças e pagamentos."
              : "Explore o menu para ver suas turmas, agenda e histórico de graduações."}
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDojoContext } from "@/hooks/useDojoContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, GraduationCap, CalendarDays, CreditCard, 
  Clock, UserCog, TrendingUp, CheckCircle, XCircle, 
  CalendarCheck 
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, Tooltip
} from "recharts";

interface DashboardStatsProps {
  isAdmin: boolean;
  canManageStudents: boolean;
}

// Read CSS variable values at render time for theme-awareness
function getCSSColor(varName: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value ? `hsl(${value})` : "hsl(0 0% 50%)";
}

function useThemeColors() {
  const [colors, setColors] = React.useState({
    success: "hsl(142, 70%, 40%)",
    warning: "hsl(38, 92%, 50%)",
    destructive: "hsl(0, 84%, 50%)",
    accent: "hsl(4, 85%, 50%)",
    muted: "hsl(0, 0%, 45%)",
    primary: "hsl(220, 15%, 20%)",
  });

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setColors({
        success: getCSSColor("--success"),
        warning: getCSSColor("--warning"),
        destructive: getCSSColor("--destructive"),
        accent: getCSSColor("--accent"),
        muted: getCSSColor("--muted-foreground"),
        primary: getCSSColor("--primary"),
      });
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  return colors;
}

interface DashboardStatsData {
  totalStudents: number;
  activeClasses: number;
  pendingApprovals: number;
  pendingPayments: number;
  totalSenseis: number;
  presentCount: number;
  totalAttendance: number;
  attendanceRate: number;
  totalReceived: number;
  overduePayments: number;
  recentGraduations: number;
  monthlyAttendance: { name: string; presencas: number; total: number; taxa: number }[];
}

export function DashboardStats({ isAdmin, canManageStudents }: DashboardStatsProps) {
  const { currentDojoId } = useDojoContext();
  const COLORS = useThemeColors();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-complete-stats", currentDojoId],
    queryFn: async (): Promise<DashboardStatsData> => {
      // Single server-side RPC call instead of 10+ parallel queries
      const { data, error } = await supabase.rpc("get_dashboard_stats", {
        _dojo_id: currentDojoId || null,
      });

      if (error) throw error;

      const result = data as any;
      return {
        totalStudents: result.totalStudents || 0,
        activeClasses: result.activeClasses || 0,
        pendingApprovals: result.pendingApprovals || 0,
        pendingPayments: result.pendingPayments || 0,
        totalSenseis: result.totalSenseis || 0,
        presentCount: result.presentCount || 0,
        totalAttendance: result.totalAttendance || 0,
        attendanceRate: result.attendanceRate || 0,
        totalReceived: Number(result.totalReceived) || 0,
        overduePayments: result.overduePayments || 0,
        recentGraduations: result.recentGraduations || 0,
        monthlyAttendance: (result.monthlyAttendance || []).map((m: any) => ({
          name: m.name,
          presencas: Number(m.presencas) || 0,
          total: Number(m.total) || 0,
          taxa: Number(m.taxa) || 0,
        })),
      };
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted/60 rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted/60 rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Prepare pie chart data for attendance
  const attendancePieData = [
    { name: "Presentes", value: stats?.presentCount || 0, color: COLORS.success },
    { name: "Ausentes", value: (stats?.totalAttendance || 0) - (stats?.presentCount || 0), color: COLORS.destructive }
  ];

  // Prepare pie chart data for payments
  const paymentPieData = [
    { name: "Pagos", value: stats?.totalReceived || 0, color: COLORS.success },
    { name: "Pendentes", value: stats?.pendingPayments || 0, color: COLORS.warning },
    { name: "Atrasados", value: stats?.overduePayments || 0, color: COLORS.destructive }
  ];

  return (
    <div className="space-y-6">
      {/* Primary Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-tour="stats-cards">
        {canManageStudents && (
          <Link to="/students">
            <Card className="hover:border-accent/50 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:-translate-y-0.5 group">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Alunos Ativos</CardTitle>
                <Users className="h-4 w-4 text-accent transition-transform duration-300 group-hover:scale-110" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalStudents}</div>
                <p className="text-xs text-muted-foreground mt-1">matriculados</p>
              </CardContent>
            </Card>
          </Link>
        )}

        {isAdmin && (
          <Link to="/senseis">
            <Card className="hover:border-accent/50 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:-translate-y-0.5 group">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Senseis</CardTitle>
                <UserCog className="h-4 w-4 text-accent transition-transform duration-300 group-hover:scale-110" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalSenseis}</div>
                <p className="text-xs text-muted-foreground mt-1">instrutores</p>
              </CardContent>
            </Card>
          </Link>
        )}

        <Link to="/classes">
          <Card className="hover:border-accent/50 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:-translate-y-0.5 group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Turmas Ativas</CardTitle>
              <GraduationCap className="h-4 w-4 text-accent transition-transform duration-300 group-hover:scale-110" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeClasses}</div>
              <p className="text-xs text-muted-foreground mt-1">em funcionamento</p>
            </CardContent>
          </Card>
        </Link>

        {canManageStudents && (
          <Link to="/students">
            <Card className="hover:border-warning/50 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:-translate-y-0.5 group">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Aprovações Pendentes</CardTitle>
                <Clock className="h-4 w-4 text-warning transition-transform duration-300 group-hover:scale-110" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.pendingApprovals}</div>
                {(stats?.pendingApprovals || 0) > 0 && (
                  <p className="text-xs text-warning mt-1">Aguardando revisão</p>
                )}
              </CardContent>
            </Card>
          </Link>
        )}
      </div>

      {/* Charts Section */}
      {canManageStudents && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Attendance Overview */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-accent" />
                Presenças do Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-2xl font-bold">{stats?.attendanceRate}%</div>
                  <p className="text-xs text-muted-foreground">taxa de presença</p>
                </div>
                <div className="h-16 w-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={attendancePieData}
                        innerRadius={18}
                        outerRadius={28}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {attendancePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-success" />
                  {stats?.presentCount} presentes
                </span>
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-destructive" />
                  {(stats?.totalAttendance || 0) - (stats?.presentCount || 0)} ausentes
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Attendance Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-accent" />
                Evolução de Presenças
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.monthlyAttendance || []}>
                    <defs>
                      <linearGradient id="colorPresencas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.accent} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={COLORS.accent} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number, name: string) => [value, name === 'presencas' ? 'Presenças' : name]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="presencas" 
                      stroke={COLORS.accent} 
                      fillOpacity={1} 
                      fill="url(#colorPresencas)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Últimos 6 meses
              </p>
            </CardContent>
          </Card>

          {/* Payments Overview */}
          <Link to="/payments">
            <Card className="hover:border-accent/50 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-lg h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-accent" />
                  Situação Financeira
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Total Recebido</span>
                    <span className="font-semibold text-success">
                      R$ {stats?.totalReceived?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Pendentes</span>
                    <span className="font-semibold text-warning">{stats?.pendingPayments}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Atrasados</span>
                    <span className="font-semibold text-destructive">{stats?.overduePayments}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Clique para ver detalhes
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* Secondary Stats */}
      {canManageStudents && (
        <div className="grid gap-4 md:grid-cols-3">
          <Link to="/classes">
            <Card className="hover:border-accent/50 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Registros de Presença</CardTitle>
                <CalendarDays className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalAttendance}</div>
                <p className="text-xs text-muted-foreground mt-1">neste mês</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/graduations">
            <Card className="hover:border-gold/50 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Graduações Recentes</CardTitle>
                <TrendingUp className="h-4 w-4 text-gold" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.recentGraduations}</div>
                <p className="text-xs text-muted-foreground mt-1">últimos 3 meses</p>
              </CardContent>
            </Card>
          </Link>

          <Link to="/classes">
            <Card className="hover:border-accent/50 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Agenda</CardTitle>
                <CalendarCheck className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.activeClasses}</div>
                <p className="text-xs text-muted-foreground mt-1">turmas programadas</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}
    </div>
  );
}

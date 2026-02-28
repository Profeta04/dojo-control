import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from "recharts";
import { TrendingUp, TrendingDown, PieChart as PieChartIcon, BarChart3 } from "lucide-react";
import { format, subMonths, parseISO, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tables } from "@/integrations/supabase/types";

type Payment = Tables<"payments">;

interface FinancialDashboardProps {
  payments: Payment[];
}

const COLORS = {
  pago: "hsl(var(--chart-2))",
  pendente: "hsl(var(--chart-3))",
  atrasado: "hsl(var(--destructive))",
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function FinancialDashboard({ payments }: FinancialDashboardProps) {
  // Calculate monthly revenue data for the last 6 months
  const monthlyData = useMemo(() => {
    const months: { month: string; monthLabel: string; recebido: number; pendente: number; atrasado: number }[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStr = format(date, "yyyy-MM");
      const monthLabel = format(date, "MMM", { locale: ptBR });
      
      const monthPayments = payments.filter(p => {
        if (!p.reference_month) return false;
        // reference_month can be "2026-02" or "2026-02-01" — normalize to yyyy-MM
        const refMonth = p.reference_month.substring(0, 7);
        return refMonth === monthStr;
      });
      
      const recebido = monthPayments
        .filter(p => p.status === "pago")
        .reduce((acc, p) => acc + p.amount, 0);
      
      const pendente = monthPayments
        .filter(p => p.status === "pendente")
        .reduce((acc, p) => acc + p.amount, 0);
      
      const atrasado = monthPayments
        .filter(p => p.status === "atrasado")
        .reduce((acc, p) => acc + p.amount, 0);
      
      months.push({ month: monthStr, monthLabel, recebido, pendente, atrasado });
    }
    
    return months;
  }, [payments]);

  // Calculate delinquency rate per month
  const delinquencyData = useMemo(() => {
    return monthlyData.map(m => {
      const total = m.recebido + m.pendente + m.atrasado;
      const inadimplencia = total > 0 ? ((m.atrasado + m.pendente) / total) * 100 : 0;
      return {
        monthLabel: m.monthLabel,
        inadimplencia: Math.round(inadimplencia),
      };
    });
  }, [monthlyData]);

  // Calculate status distribution
  const statusDistribution = useMemo(() => {
    const pago = payments.filter(p => p.status === "pago").length;
    const pendente = payments.filter(p => p.status === "pendente").length;
    const atrasado = payments.filter(p => p.status === "atrasado").length;
    
    return [
      { name: "Pagos", value: pago, color: COLORS.pago },
      { name: "Pendentes", value: pendente, color: COLORS.pendente },
      { name: "Atrasados", value: atrasado, color: COLORS.atrasado },
    ].filter(item => item.value > 0);
  }, [payments]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalRecebido = payments
      .filter(p => p.status === "pago")
      .reduce((acc, p) => acc + p.amount, 0);
    
    const totalPendente = payments
      .filter(p => p.status === "pendente" || p.status === "atrasado")
      .reduce((acc, p) => acc + p.amount, 0);

    const currentMonth = format(new Date(), "yyyy-MM");
    const lastMonth = format(subMonths(new Date(), 1), "yyyy-MM");

    const currentMonthRevenue = payments
      .filter(p => p.reference_month?.substring(0, 7) === currentMonth && p.status === "pago")
      .reduce((acc, p) => acc + p.amount, 0);

    const lastMonthRevenue = payments
      .filter(p => p.reference_month?.substring(0, 7) === lastMonth && p.status === "pago")
      .reduce((acc, p) => acc + p.amount, 0);

    const revenueChange = lastMonthRevenue > 0 
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;

    const delinquencyRate = payments.length > 0
      ? (payments.filter(p => p.status === "atrasado").length / payments.length) * 100
      : 0;

    return { totalRecebido, totalPendente, currentMonthRevenue, revenueChange, delinquencyRate };
  }, [payments]);

  return (
    <div className="space-y-6 mb-8">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Receita Total (Pagos)</CardDescription>
            <CardTitle className="text-2xl text-success">
              {formatCurrency(totals.totalRecebido)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>A Receber</CardDescription>
            <CardTitle className="text-2xl text-warning">
              {formatCurrency(totals.totalPendente)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              Receita Mês Atual
              {totals.revenueChange !== 0 && (
                totals.revenueChange > 0 
                  ? <TrendingUp className="h-3 w-3 text-success" />
                  : <TrendingDown className="h-3 w-3 text-destructive" />
              )}
            </CardDescription>
            <div className="flex items-baseline gap-2">
              <CardTitle className="text-2xl">
                {formatCurrency(totals.currentMonthRevenue)}
              </CardTitle>
              {totals.revenueChange !== 0 && (
                <span className={`text-xs ${totals.revenueChange > 0 ? "text-success" : "text-destructive"}`}>
                  {totals.revenueChange > 0 ? "+" : ""}{totals.revenueChange.toFixed(0)}%
                </span>
              )}
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Taxa de Inadimplência</CardDescription>
            <CardTitle className={`text-2xl ${totals.delinquencyRate > 20 ? "text-destructive" : totals.delinquencyRate > 10 ? "text-warning" : "text-success"}`}>
              {totals.delinquencyRate.toFixed(1)}%
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Receita por Mês
            </CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="monthLabel" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `R$${value / 1000}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="recebido" name="Recebido" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pendente" name="Pendente" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="atrasado" name="Atrasado" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="h-4 w-4" />
              Distribuição por Status
            </CardTitle>
            <CardDescription>Todos os pagamentos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {statusDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value} pagamentos`, '']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Delinquency Rate Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4" />
              Evolução da Inadimplência
            </CardTitle>
            <CardDescription>Percentual de pagamentos pendentes/atrasados por mês</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={delinquencyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="monthLabel" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `${value}%`}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, 'Inadimplência']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="inadimplencia" 
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

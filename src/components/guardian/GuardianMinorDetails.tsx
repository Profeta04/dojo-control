import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { RegistrationStatusBadge } from "@/components/shared/StatusBadge";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { User, CreditCard, GraduationCap, Calendar, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PAYMENT_CATEGORY_LABELS, PaymentCategory } from "@/lib/constants";

type Profile = Tables<"profiles">;
type Payment = Tables<"payments">;
type GraduationHistory = Tables<"graduation_history">;
type Attendance = Tables<"attendance">;

interface GuardianMinorDetailsProps {
  minor: Profile;
}

export function GuardianMinorDetails({ minor }: GuardianMinorDetailsProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [graduations, setGraduations] = useState<GraduationHistory[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [dojoData, setDojoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMinorData = async () => {
      setLoading(true);

      // Fetch payments
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("*")
        .eq("student_id", minor.user_id)
        .order("due_date", { ascending: false })
        .limit(12);

      // Fetch graduations
      const { data: graduationsData } = await supabase
        .from("graduation_history")
        .select("*")
        .eq("student_id", minor.user_id)
        .order("graduation_date", { ascending: false });

      // Fetch recent attendance
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", minor.user_id)
        .order("date", { ascending: false })
        .limit(30);

      // Fetch dojo data for late fee calculation
      if (minor.dojo_id) {
        const { data: dojo } = await supabase
          .from("dojos")
          .select("late_fee_percent, late_fee_fixed, daily_interest_percent, grace_days")
          .eq("id", minor.dojo_id)
          .single();
        setDojoData(dojo);
      }

      setPayments(paymentsData || []);
      setGraduations(graduationsData || []);
      setAttendance(attendanceData || []);
      setLoading(false);
    };

    fetchMinorData();
  }, [minor.user_id]);

  if (loading) {
    return <LoadingSpinner />;
  }

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case "pago":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "pendente":
        return <Clock className="h-4 w-4 text-warning" />;
      case "atrasado":
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const calculateLateFees = (payment: Payment) => {
    if (payment.status !== "atrasado" || !dojoData) return null;
    const graceDays = dojoData.grace_days || 0;
    const daysLate = differenceInCalendarDays(new Date(), parseISO(payment.due_date)) - graceDays;
    if (daysLate <= 0) return null;
    const feePercent = dojoData.late_fee_percent || 0;
    const fixedFee = dojoData.late_fee_fixed || 0;
    const interestPercent = dojoData.daily_interest_percent || 0;
    const fee = payment.amount * (feePercent / 100) + fixedFee;
    const interest = payment.amount * (interestPercent / 100) * daysLate;
    const total = payment.amount + fee + interest;
    return { fee, interest, total, daysLate };
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const attendanceRate = attendance.length > 0
    ? Math.round((attendance.filter(a => a.present).length / attendance.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Minor Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle>{minor.name}</CardTitle>
              <CardDescription>{minor.email}</CardDescription>
              <div className="flex gap-2 mt-2">
                {minor.belt_grade && <BeltBadge grade={minor.belt_grade} />}
                {minor.registration_status && <RegistrationStatusBadge status={minor.registration_status} />}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs for different sections */}
      <Tabs defaultValue="payments" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Pagamentos
          </TabsTrigger>
          <TabsTrigger value="graduations" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Graduações
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Presenças
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Pagamentos</CardTitle>
              <CardDescription>Últimos 12 meses de mensalidades</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum pagamento registrado
                </p>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => {
                    const lateFees = calculateLateFees(payment);
                    return (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        {getPaymentStatusIcon(payment.status)}
                        <div>
                          <p className="font-medium">{payment.reference_month}</p>
                          <p className="text-sm text-muted-foreground">
                            Vencimento: {format(new Date(payment.due_date), "dd/MM/yyyy")}
                          </p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {PAYMENT_CATEGORY_LABELS[payment.category as PaymentCategory] || payment.category}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(payment.amount)}
                        </p>
                        {lateFees && (
                          <div className="text-xs space-y-0.5 mt-1">
                            {lateFees.fee > 0 && (
                              <p className="text-destructive">+ {formatCurrency(lateFees.fee)} multa</p>
                            )}
                            {lateFees.interest > 0 && (
                              <p className="text-destructive">+ {formatCurrency(lateFees.interest)} juros ({lateFees.daysLate}d)</p>
                            )}
                            <p className="font-bold text-destructive">{formatCurrency(lateFees.total)}</p>
                          </div>
                        )}
                        {!lateFees && (
                        <p className={`text-sm capitalize ${
                          payment.status === "pago" ? "text-success" :
                          payment.status === "atrasado" ? "text-destructive" :
                          "text-warning"
                        }`}>
                          {payment.status}
                        </p>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="graduations" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Graduações</CardTitle>
              <CardDescription>Progressão de faixas</CardDescription>
            </CardHeader>
            <CardContent>
              {graduations.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nenhuma graduação registrada
                </p>
              ) : (
                <div className="space-y-3">
                  {graduations.map((graduation) => (
                    <div
                      key={graduation.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <GraduationCap className="h-5 w-5 text-primary" />
                        <div>
                        <div className="flex items-center gap-2">
                            {graduation.from_belt && (
                              <>
                                <BeltBadge grade={graduation.from_belt} />
                                <span className="text-muted-foreground">→</span>
                              </>
                            )}
                            <BeltBadge grade={graduation.to_belt} />
                          </div>
                          {graduation.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {graduation.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(graduation.graduation_date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Registro de Presenças</CardTitle>
              <CardDescription>
                Taxa de presença: {attendanceRate}% (últimas {attendance.length} aulas)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attendance.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nenhuma presença registrada
                </p>
              ) : (
                <div className="space-y-2">
                  {attendance.slice(0, 15).map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        {record.present ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        <span className={record.present ? "text-foreground" : "text-muted-foreground"}>
                          {record.present ? "Presente" : "Ausente"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(record.date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  ))}
                  {attendance.length > 15 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      ... e mais {attendance.length - 15} registros
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

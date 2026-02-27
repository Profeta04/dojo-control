import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { RegistrationStatusBadge } from "@/components/shared/StatusBadge";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { User, CreditCard, Calendar, CheckCircle, XCircle, Clock, AlertTriangle, CalendarDays } from "lucide-react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PAYMENT_CATEGORY_LABELS, PaymentCategory } from "@/lib/constants";

type Profile = Tables<"profiles">;
type Payment = Tables<"payments">;
type Attendance = Tables<"attendance">;

interface ScheduledClass {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  class_name: string;
  is_cancelled: boolean;
}

interface GuardianMinorDetailsProps {
  minor: Profile;
}

export function GuardianMinorDetails({ minor }: GuardianMinorDetailsProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [upcomingClasses, setUpcomingClasses] = useState<ScheduledClass[]>([]);
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

      // Fetch recent attendance
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", minor.user_id)
        .order("date", { ascending: false })
        .limit(30);

      // Fetch enrolled classes then upcoming schedule
      const { data: enrollments } = await supabase
        .from("class_students")
        .select("class_id, classes:class_id (id, name, is_active)")
        .eq("student_id", minor.user_id);

      const activeClassIds = (enrollments || [])
        .filter((e: any) => e.classes?.is_active)
        .map((e: any) => e.classes.id);

      let scheduled: ScheduledClass[] = [];
      if (activeClassIds.length > 0) {
        const today = format(new Date(), "yyyy-MM-dd");
        const { data: scheduleData } = await supabase
          .from("class_schedule")
          .select("id, date, start_time, end_time, class_id, is_cancelled")
          .in("class_id", activeClassIds)
          .gte("date", today)
          .order("date")
          .order("start_time")
          .limit(10);

        const classNameMap = (enrollments || []).reduce((acc: Record<string, string>, e: any) => {
          if (e.classes) acc[e.classes.id] = e.classes.name;
          return acc;
        }, {});

        scheduled = (scheduleData || []).map(s => ({
          id: s.id,
          date: s.date,
          start_time: s.start_time,
          end_time: s.end_time,
          class_name: classNameMap[s.class_id] || "Treino",
          is_cancelled: s.is_cancelled || false,
        }));
      }

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
      setAttendance(attendanceData || []);
      setUpcomingClasses(scheduled);
      setLoading(false);
    };

    fetchMinorData();
  }, [minor.user_id, minor.dojo_id]);

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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatTime = (time: string) => time.slice(0, 5);

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

      {/* Tabs */}
      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Frequência</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Pagamentos</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">Agenda</span>
          </TabsTrigger>
        </TabsList>

        {/* Attendance Tab */}
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

        {/* Payments Tab */}
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
                          <p className="font-semibold">{formatCurrency(payment.amount)}</p>
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

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Próximos Treinos</CardTitle>
              <CardDescription>Agenda de treinos do dependente</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingClasses.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum treino agendado
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingClasses.map((sc) => (
                    <div
                      key={sc.id}
                      className={`flex items-center justify-between p-3 rounded-lg bg-muted/50 ${sc.is_cancelled ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <CalendarDays className="h-5 w-5 text-accent" />
                        <div>
                          <p className="font-medium">{sc.class_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(sc.date + "T00:00:00"), "EEEE, dd/MM", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div className="flex items-center gap-1 text-sm font-mono">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {formatTime(sc.start_time)} - {formatTime(sc.end_time)}
                        </div>
                        {sc.is_cancelled && (
                          <Badge variant="destructive" className="text-xs">Cancelado</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

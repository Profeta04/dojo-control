import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle2, XCircle } from "lucide-react";
import { JUSTIFICATION_CATEGORIES, JUSTIFICATION_STATUS } from "./JustificationCategories";
import { Skeleton } from "@/components/ui/skeleton";

export function StudentJustificationForm() {
  const { user } = useAuth();

  const { data: myJustifications, isLoading } = useQuery({
    queryKey: ["my-justifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("absence_justifications")
        .select("*, attendance(date, classes(name))")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const getCategoryLabel = (value: string) =>
    JUSTIFICATION_CATEGORIES.find(c => c.value === value)?.label || value;

  const getStatusInfo = (status: string) =>
    JUSTIFICATION_STATUS[status as keyof typeof JUSTIFICATION_STATUS] || JUSTIFICATION_STATUS.pendente;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-primary" />
          Minhas Justificativas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : !myJustifications || myJustifications.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma justificativa enviada ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {myJustifications.map((j: any) => {
              const statusInfo = getStatusInfo(j.status);
              return (
                <div key={j.id} className="p-3 rounded-lg border space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {j.attendance?.date
                        ? format(new Date(j.attendance.date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
                        : "—"}
                    </span>
                    <Badge variant="outline" className={`text-[10px] ${statusInfo.color}`}>
                      {j.status === "aprovada" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {j.status === "rejeitada" && <XCircle className="h-3 w-3 mr-1" />}
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {getCategoryLabel(j.category)}
                    {j.attendance?.classes?.name ? ` • ${j.attendance.classes.name}` : ""}
                  </p>
                  {j.description && (
                    <p className="text-xs text-muted-foreground/80 italic">{j.description}</p>
                  )}
                  {j.review_note && (
                    <p className="text-xs text-foreground/70 mt-1 border-t pt-1">
                      💬 {j.review_note}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

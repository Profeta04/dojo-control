import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { Award } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { BELT_LABELS } from "@/lib/constants";

export function GraduationTimeline() {
  const { user } = useAuth();

  const { data: history, isLoading } = useQuery({
    queryKey: ["student-full-graduation-history", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("graduation_history")
        .select("*")
        .eq("student_id", user.id)
        .order("graduation_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Award className="h-5 w-5" />
          Histórico de Graduações
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!history || history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Award className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma graduação registrada ainda</p>
          </div>
        ) : (
          <div className="relative pl-6">
            {/* Timeline line */}
            <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-border" />

            <div className="space-y-6">
              {history.map((grad, index) => (
                <div key={grad.id} className="relative">
                  {/* Timeline dot */}
                  <div className="absolute -left-[18px] top-1 w-3 h-3 rounded-full bg-primary ring-2 ring-background" />

                  <div className="rounded-lg bg-muted p-4 border border-border/40">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-3">
                        {grad.from_belt && (
                          <>
                            <BeltBadge grade={grad.from_belt as any} size="sm" />
                            <span className="text-muted-foreground">→</span>
                          </>
                        )}
                        <BeltBadge grade={grad.to_belt as any} size="sm" />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(grad.graduation_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    {grad.notes && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        {grad.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

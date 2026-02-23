import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { Award } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { BELT_LABELS, getBjjBeltLabel } from "@/lib/constants";

const MARTIAL_ART_LABELS: Record<string, string> = {
  judo: "Judô",
  bjj: "Jiu-Jitsu",
};

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
    <Card data-tour="graduation-timeline">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <Award className="h-5 w-5 text-accent" />
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

            {/* Group by martial art */}
            {(() => {
              const artGroups = new Map<string, typeof history>();
              history!.forEach((grad) => {
                const art = grad.martial_art || "judo";
                if (!artGroups.has(art)) artGroups.set(art, []);
                artGroups.get(art)!.push(grad);
              });
              const groups = Array.from(artGroups.entries());
              const showArtLabel = groups.length > 1;

              return groups.map(([art, grads]) => (
                <div key={art} className="space-y-4">
                  {showArtLabel && (
                    <h4 className="text-sm font-semibold text-muted-foreground ml-1">{MARTIAL_ART_LABELS[art] || art}</h4>
                  )}
                  {grads.map((grad) => (
                    <div key={grad.id} className="relative">
                      <div className="absolute -left-[18px] top-1 w-3 h-3 rounded-full bg-primary ring-2 ring-background" />
                      <div className="rounded-lg bg-muted p-4 border border-border/40">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex items-center gap-3">
                            {grad.from_belt && (
                              <>
                                <BeltBadge grade={grad.from_belt as any} size="sm" martialArt={grad.martial_art} degree={(grad as any).from_degree || 0} />
                                <span className="text-muted-foreground">→</span>
                              </>
                            )}
                            <BeltBadge grade={grad.to_belt as any} size="sm" martialArt={grad.martial_art} degree={(grad as any).to_degree || 0} />
                            {!showArtLabel && (
                              <span className="text-xs text-muted-foreground">{MARTIAL_ART_LABELS[grad.martial_art] || grad.martial_art}</span>
                            )}
                            {grad.martial_art === "bjj" && (grad as any).to_degree > 0 && (
                              <span className="text-xs text-muted-foreground">{(grad as any).to_degree}º grau</span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(grad.graduation_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </span>
                        </div>
                        {grad.notes && (
                          <p className="text-xs text-muted-foreground mt-2 italic">{grad.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ));
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

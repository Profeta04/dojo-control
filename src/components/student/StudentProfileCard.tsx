import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { User, Calendar, Award, Phone, Mail } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

export function StudentProfileCard() {
  const { profile, user } = useAuth();

  const { data: graduationHistory, isLoading: loadingGraduations } = useQuery({
    queryKey: ["student-graduation-history", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("graduation_history")
        .select("*")
        .eq("student_id", user.id)
        .order("graduation_date", { ascending: false })
        .limit(1);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: studentClasses, isLoading: loadingClasses } = useQuery({
    queryKey: ["student-classes", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("class_students")
        .select(`
          class_id,
          classes:class_id (
            id,
            name,
            schedule,
            is_active
          )
        `)
        .eq("student_id", user.id);
      
      if (error) throw error;
      return data?.filter(cs => cs.classes?.is_active) || [];
    },
    enabled: !!user?.id,
  });

  const lastGraduation = graduationHistory?.[0];

  if (!profile) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-primary/5 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-5 w-5" />
          Meu Perfil
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar and Belt */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
              {profile.name?.charAt(0).toUpperCase() || "?"}
            </div>
            {profile.belt_grade && (
              <BeltBadge grade={profile.belt_grade as any} size="lg" />
            )}
          </div>

          {/* Student Info */}
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-xl font-semibold">{profile.name}</h3>
              <p className="text-sm text-muted-foreground">Judoca</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{profile.email}</span>
                </div>
              )}
              {profile.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.phone}</span>
                </div>
              )}
              {profile.birth_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(profile.birth_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                </div>
              )}
            </div>

            {/* Last Graduation */}
            {lastGraduation && (
              <div className="pt-3 border-t border-border">
                <div className="flex items-center gap-2 text-sm">
                  <Award className="h-4 w-4 text-accent" />
                  <span className="text-muted-foreground">Última graduação:</span>
                  <span className="font-medium">
                    {format(new Date(lastGraduation.graduation_date), "dd/MM/yyyy")}
                  </span>
                </div>
              </div>
            )}

            {/* Classes */}
            {loadingClasses ? (
              <Skeleton className="h-8 w-full" />
            ) : studentClasses && studentClasses.length > 0 ? (
              <div className="pt-3 border-t border-border">
                <p className="text-sm text-muted-foreground mb-2">Minhas Turmas:</p>
                <div className="flex flex-wrap gap-2">
                  {studentClasses.map((cs) => (
                    <span
                      key={cs.class_id}
                      className="px-3 py-1 bg-accent/10 text-accent text-sm rounded-full"
                    >
                      {cs.classes?.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="pt-3 border-t border-border">
                <p className="text-sm text-muted-foreground">Nenhuma turma vinculada</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
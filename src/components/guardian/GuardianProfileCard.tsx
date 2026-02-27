import { useAuth } from "@/hooks/useAuth";
import { useGuardianMinors } from "@/hooks/useGuardianMinors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, Users, Calendar, Shield } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AvatarUpload } from "@/components/student/AvatarUpload";
import { Badge } from "@/components/ui/badge";
import { BeltBadge } from "@/components/shared/BeltBadge";

export function GuardianProfileCard() {
  const { profile } = useAuth();
  const { minors } = useGuardianMinors();

  if (!profile) return null;

  return (
    <Card data-tour="guardian-profile-card" className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border/50 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
          Meus Dados
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-4">
          <AvatarUpload />

          <Badge variant="secondary" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Responsável
          </Badge>

          <div className="text-center">
            <h3 className="text-xl font-semibold">{profile.name}</h3>
          </div>

          {profile.birth_date && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(new Date(profile.birth_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
            </div>
          )}

          <div className="w-full pt-3 border-t border-border space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Contato</p>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{profile.email || "Não informado"}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{profile.phone || "Não informado"}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function GuardianMinorsSummaryCard() {
  const { minors, loading } = useGuardianMinors();

  if (loading || minors.length === 0) return null;

  return (
    <Card data-tour="guardian-minors-summary">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <Users className="h-5 w-5 text-accent" />
          Dependentes Vinculados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {minors.map((minor) => (
            <div
              key={minor.user_id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  {minor.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{minor.name}</p>
                  <p className="text-xs text-muted-foreground">{minor.email}</p>
                </div>
              </div>
              {minor.belt_grade && (
                <BeltBadge grade={minor.belt_grade as any} size="sm" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

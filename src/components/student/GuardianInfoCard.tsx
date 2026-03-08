import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Mail, Phone, User } from "lucide-react";

export function GuardianInfoCard() {
  const { profile } = useAuth();

  const guardianName = (profile as any)?.guardian_name;
  const guardianEmail = profile?.guardian_email;
  const guardianPhone = (profile as any)?.guardian_phone;

  // Only show if any guardian info exists
  if (!guardianEmail && !guardianName && !guardianPhone) return null;

  return (
    <Card data-tour="guardian-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <Users className="h-5 w-5 text-accent" />
          Responsável
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {guardianName && (
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{guardianName}</span>
            </div>
          )}
          {guardianEmail && (
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{guardianEmail}</span>
            </div>
          )}
          {guardianPhone && (
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{guardianPhone}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Mail, Phone } from "lucide-react";

export function GuardianInfoCard() {
  const { profile } = useAuth();

  // Only show if guardian_email is set on the student profile
  if (!profile?.guardian_email) return null;

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
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>{profile.guardian_email}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

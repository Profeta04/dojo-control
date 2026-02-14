import { useAuth } from "@/hooks/useAuth";
import { useGuardianMinors } from "@/hooks/useGuardianMinors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Mail, Phone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export function GuardianInfoCard() {
  const { profile } = useAuth();

  const guardianUserId = profile?.guardian_user_id;

  const { data: guardian, isLoading } = useQuery({
    queryKey: ["guardian-profile", guardianUserId],
    queryFn: async () => {
      if (!guardianUserId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("name, email, phone")
        .eq("user_id", guardianUserId)
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!guardianUserId,
  });

  // If no guardian linked, don't render
  if (!guardianUserId && !profile?.guardian_email) return null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          Responsável
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {guardian ? (
            <>
              <div className="flex items-center gap-3 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{guardian.name}</span>
              </div>
              {guardian.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{guardian.email}</span>
                </div>
              )}
              {guardian.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{guardian.phone}</span>
                </div>
              )}
            </>
          ) : profile?.guardian_email ? (
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{profile.guardian_email}</span>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

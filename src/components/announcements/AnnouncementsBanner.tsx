import { useQuery } from "@tanstack/react-query";
import { useDojoContext } from "@/hooks/useDojoContext";
import { fetchAnnouncements, Announcement } from "@/services/announcementsService";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Pin, Megaphone } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";

export function AnnouncementsBanner() {
  const { currentDojoId } = useDojoContext();
  const { profile } = useAuth();
  const dojoId = currentDojoId || profile?.dojo_id || "";

  const { data: announcements } = useQuery({
    queryKey: ["announcements", dojoId],
    queryFn: () => fetchAnnouncements(dojoId),
    enabled: !!dojoId,
    staleTime: 1000 * 60 * 2,
  });

  // Show only pinned or urgent, max 3
  const featured = (announcements || [])
    .filter((a) => a.is_pinned || a.is_urgent)
    .slice(0, 3);

  if (featured.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Megaphone className="h-4 w-4 text-primary" />
        <span>Avisos do Dojo</span>
      </div>
      {featured.map((ann) => (
        <Card
          key={ann.id}
          className={ann.is_urgent ? "border-destructive/50 bg-destructive/5" : "border-primary/20 bg-primary/5"}
        >
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {ann.is_urgent && (
                <Badge variant="destructive" className="gap-1 text-xs">
                  <AlertTriangle className="h-3 w-3" /> Urgente
                </Badge>
              )}
              {ann.is_pinned && !ann.is_urgent && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Pin className="h-3 w-3" /> Fixado
                </Badge>
              )}
              <span className="font-semibold text-sm">{ann.title}</span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{ann.content}</p>
            {ann.image_url && (
              <img
                src={ann.image_url}
                alt=""
                className="mt-2 rounded-md max-h-32 object-cover w-full"
                loading="lazy"
              />
            )}
            <p className="text-[11px] text-muted-foreground/60 mt-1.5">
              {ann.author_name} • {format(new Date(ann.created_at), "dd MMM", { locale: ptBR })}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDojoContext } from "@/hooks/useDojoContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, FileText, Download, Loader2, Eye } from "lucide-react";
import { JUSTIFICATION_CATEGORIES, JUSTIFICATION_STATUS } from "./JustificationCategories";
import { useSignedUrl } from "@/hooks/useSignedUrl";

export function JustificationApprovalPanel() {
  const { user } = useAuth();
  const { currentDojoId } = useDojoContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getSignedUrl } = useSignedUrl();
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);

  const { data: justifications, isLoading } = useQuery({
    queryKey: ["dojo-justifications", currentDojoId],
    queryFn: async () => {
      if (!currentDojoId) return [];

      // Get students from this dojo
      const { data: students } = await supabase
        .from("profiles")
        .select("user_id, name")
        .eq("dojo_id", currentDojoId);

      if (!students || students.length === 0) return [];
      const studentIds = students.map(s => s.user_id);
      const studentMap = Object.fromEntries(students.map(s => [s.user_id, s.name]));

      const { data, error } = await supabase
        .from("absence_justifications")
        .select("*, attendance(date, classes(name))")
        .in("student_id", studentIds)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []).map((j: any) => ({ ...j, student_name: studentMap[j.student_id] || "Aluno" }));
    },
    enabled: !!currentDojoId,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("absence_justifications")
        .update({
          status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_note: reviewNote.trim() || null,
        })
        .eq("id", id);
      if (error) throw error;

      // Find the student to notify
      const justification = justifications?.find(j => j.id === id);
      if (justification?.student_id) {
        const statusLabel = status === "aprovada" ? "aprovada ✅" : "rejeitada ❌";
        const notification = {
          user_id: justification.student_id,
          title: `Justificativa ${statusLabel}`,
          message: reviewNote.trim()
            ? `Sua justificativa foi ${status}. Nota: ${reviewNote.trim()}`
            : `Sua justificativa de falta foi ${status}.`,
          type: status === "aprovada" ? "info" : "warning",
        };

        await supabase.from("notifications").insert(notification).throwOnError();

        // Send push notification
        supabase.functions.invoke("send-push-notification", {
          body: {
            userIds: [justification.student_id],
            title: `Justificativa ${statusLabel}`,
            body: notification.message,
            url: "/perfil",
            type: status === "aprovada" ? "info" : "warning",
          },
        }).catch(() => {});
      }
    },
    onSuccess: (_, vars) => {
      toast({ title: vars.status === "aprovada" ? "Justificativa aprovada ✅" : "Justificativa rejeitada" });
      queryClient.invalidateQueries({ queryKey: ["dojo-justifications"] });
      setReviewingId(null);
      setReviewNote("");
    },
    onError: (err: any) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const viewAttachment = async (path: string) => {
    const url = await getSignedUrl("justification-attachments", path);
    if (url) {
      setAttachmentUrl(url);
    } else {
      toast({ title: "Erro ao carregar anexo", variant: "destructive" });
    }
  };

  const getCategoryLabel = (val: string) =>
    JUSTIFICATION_CATEGORIES.find(c => c.value === val)?.label || val;

  const pending = justifications?.filter(j => j.status === "pendente") || [];
  const reviewed = justifications?.filter(j => j.status !== "pendente") || [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pending */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-warning" />
            Justificativas Pendentes
            {pending.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{pending.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma justificativa pendente.
            </p>
          ) : (
            <div className="space-y-3">
              {pending.map((j: any) => (
                <div key={j.id} className="p-3 rounded-lg border bg-card space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{j.student_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {j.attendance?.date
                          ? format(new Date(j.attendance.date + "T12:00:00"), "dd/MM/yyyy (EEEE)", { locale: ptBR })
                          : "—"}
                        {j.attendance?.classes?.name ? ` • ${j.attendance.classes.name}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/20">
                      Pendente
                    </Badge>
                  </div>

                  <div className="text-xs space-y-1">
                    <p><strong>Motivo:</strong> {getCategoryLabel(j.category)}</p>
                    {j.description && <p className="text-muted-foreground italic">{j.description}</p>}
                    {j.attachment_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-6 px-2 text-primary"
                        onClick={() => viewAttachment(j.attachment_url)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Ver anexo
                      </Button>
                    )}
                  </div>

                  {reviewingId === j.id ? (
                    <div className="space-y-2 border-t pt-2">
                      <Textarea
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        placeholder="Nota para o aluno (opcional)"
                        rows={2}
                        className="text-xs"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 text-xs h-8"
                          onClick={() => reviewMutation.mutate({ id: j.id, status: "aprovada" })}
                          disabled={reviewMutation.isPending}
                        >
                          {reviewMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1 text-xs h-8"
                          onClick={() => reviewMutation.mutate({ id: j.id, status: "rejeitada" })}
                          disabled={reviewMutation.isPending}
                        >
                          {reviewMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3 mr-1" />}
                          Rejeitar
                        </Button>
                      </div>
                      <Button variant="ghost" size="sm" className="w-full text-xs h-6" onClick={() => { setReviewingId(null); setReviewNote(""); }}>
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-7"
                      onClick={() => setReviewingId(j.id)}
                    >
                      Avaliar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reviewed history */}
      {reviewed.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Histórico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reviewed.map((j: any) => {
                const statusInfo = JUSTIFICATION_STATUS[j.status as keyof typeof JUSTIFICATION_STATUS] || JUSTIFICATION_STATUS.pendente;
                return (
                  <div key={j.id} className="p-2 rounded-lg border text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{j.student_name}</span>
                      <Badge variant="outline" className={`text-[10px] ${statusInfo.color}`}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">
                      {j.attendance?.date
                        ? format(new Date(j.attendance.date + "T12:00:00"), "dd/MM", { locale: ptBR })
                        : "—"}
                      {" • "}{getCategoryLabel(j.category)}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attachment viewer */}
      <Dialog open={!!attachmentUrl} onOpenChange={(open) => !open && setAttachmentUrl(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Anexo</DialogTitle>
          </DialogHeader>
          {attachmentUrl && (
            <div className="space-y-3">
              {attachmentUrl.match(/\.(jpg|jpeg|png|gif|webp)/i) ? (
                <img src={attachmentUrl} alt="Anexo" className="w-full rounded-lg max-h-[60vh] object-contain" />
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">Documento anexado</p>
                </div>
              )}
              <Button asChild variant="outline" className="w-full">
                <a href={attachmentUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar anexo
                </a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

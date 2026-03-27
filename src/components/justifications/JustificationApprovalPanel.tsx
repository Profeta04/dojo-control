import { useState, useEffect, useRef, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, FileText, Download, Loader2, Eye, Search, Filter } from "lucide-react";
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

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [categoryFilter, setCategoryFilter] = useState<string>("todos");
  const [searchTerm, setSearchTerm] = useState("");

  // Realtime — debounced invalidation
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!currentDojoId) return;
    const channel = supabase
      .channel("justifications-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "absence_justifications" },
        () => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["dojo-justifications", currentDojoId] });
          }, 800);
        }
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [currentDojoId, queryClient]);

  const { data: justifications, isLoading } = useQuery({
    queryKey: ["dojo-justifications", currentDojoId],
    queryFn: async () => {
      if (!currentDojoId) return [];

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
        .limit(100);

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

  // Apply filters
  const filtered = useMemo(() => {
    if (!justifications) return [];
    return justifications.filter((j: any) => {
      if (statusFilter !== "todos" && j.status !== statusFilter) return false;
      if (categoryFilter !== "todos" && j.category !== categoryFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const name = (j.student_name || "").toLowerCase();
        const className = (j.attendance?.classes?.name || "").toLowerCase();
        if (!name.includes(term) && !className.includes(term)) return false;
      }
      return true;
    });
  }, [justifications, statusFilter, categoryFilter, searchTerm]);

  const pending = filtered.filter(j => j.status === "pendente");
  const reviewed = filtered.filter(j => j.status !== "pendente");
  const totalPending = justifications?.filter(j => j.status === "pendente").length || 0;

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
      {/* Filters */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-xs font-medium text-muted-foreground">Filtros</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar aluno ou turma..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="aprovada">Aprovada</SelectItem>
                <SelectItem value="rejeitada">Rejeitada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas categorias</SelectItem>
                {JUSTIFICATION_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Pending */}
      {pending.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-warning" />
              Pendentes
              <Badge variant="secondary" className="ml-1 text-xs">{totalPending}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      {/* Empty state when no pending after filter */}
      {pending.length === 0 && statusFilter !== "aprovada" && statusFilter !== "rejeitada" && (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground text-center">
              {searchTerm || categoryFilter !== "todos"
                ? "Nenhuma justificativa encontrada com os filtros aplicados."
                : "Nenhuma justificativa pendente."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Reviewed history */}
      {reviewed.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Histórico
              <Badge variant="outline" className="ml-1 text-xs">{reviewed.length}</Badge>
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
                      {j.attendance?.classes?.name ? ` • ${j.attendance.classes.name}` : ""}
                    </p>
                    {j.review_note && (
                      <p className="text-muted-foreground/80 italic">💬 {j.review_note}</p>
                    )}
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
            <DialogDescription>Visualize ou baixe o documento anexado à justificativa.</DialogDescription>
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

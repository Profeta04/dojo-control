import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, FileText, Upload, CalendarX, Clock } from "lucide-react";
import { JUSTIFICATION_CATEGORIES } from "./JustificationCategories";
import { Skeleton } from "@/components/ui/skeleton";

export function UnjustifiedAbsencesCard() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAttendanceId, setSelectedAttendanceId] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data: absences, isLoading } = useQuery({
    queryKey: ["unjustified-absences", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: attendances, error } = await supabase
        .from("attendance")
        .select("id, date, class_id, classes(name)")
        .eq("student_id", user.id)
        .eq("present", false)
        .gte("date", format(sevenDaysAgo, "yyyy-MM-dd"))
        .order("date", { ascending: false });

      if (error) throw error;

      const ids = (attendances || []).map(a => a.id);
      if (ids.length === 0) return [];

      const { data: justified } = await supabase
        .from("absence_justifications")
        .select("attendance_id")
        .in("attendance_id", ids);

      const justifiedSet = new Set((justified || []).map(j => j.attendance_id));
      return (attendances || []).filter(a => !justifiedSet.has(a.id));
    },
    enabled: !!user?.id,
  });

  const getCategoryLabel = (value: string) =>
    JUSTIFICATION_CATEGORIES.find(c => c.value === value)?.label || value;

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !selectedAttendanceId || !category) throw new Error("Dados incompletos");

      let attachmentUrl: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("justification-attachments")
          .upload(path, file);
        if (uploadError) throw uploadError;
        attachmentUrl = path;
      }

      const { error } = await supabase.from("absence_justifications").insert({
        student_id: user.id,
        attendance_id: selectedAttendanceId,
        category,
        description: description.trim() || null,
        attachment_url: attachmentUrl,
      });
      if (error) throw error;

      // Notify senseis
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("name, dojo_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (userProfile?.dojo_id) {
        const { data: dojoSenseis } = await supabase
          .from("dojo_senseis")
          .select("sensei_id")
          .eq("dojo_id", userProfile.dojo_id);

        const senseiIds = (dojoSenseis || []).map(s => s.sensei_id);
        if (senseiIds.length > 0) {
          const categoryLabel = getCategoryLabel(category);
          const notifications = senseiIds.map(senseiId => ({
            user_id: senseiId,
            title: "Nova justificativa de falta",
            message: `${userProfile.name || "Aluno"} enviou justificativa: ${categoryLabel}`,
            type: "info",
          }));
          await supabase.from("notifications").insert(notifications);

          for (const senseiId of senseiIds) {
            supabase.functions.invoke("send-push-notification", {
              body: {
                userId: senseiId,
                title: "Nova justificativa de falta",
                body: `${userProfile.name || "Aluno"} enviou justificativa: ${categoryLabel}`,
                url: "/presenca",
                type: "info",
              },
            }).catch(() => {});
          }
        }
      }
    },
    onSuccess: () => {
      toast({ title: "Justificativa enviada!", description: "Aguarde a análise do sensei." });
      setDialogOpen(false);
      setSelectedAttendanceId("");
      setCategory("");
      setDescription("");
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ["unjustified-absences"] });
      queryClient.invalidateQueries({ queryKey: ["my-justifications"] });
    },
    onError: () => {
      toast({ title: "Erro ao enviar", description: "Tente novamente.", variant: "destructive" });
    },
  });

  const hasAbsences = !isLoading && absences && absences.length > 0;

  if (!isLoading && !hasAbsences) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarX className="h-5 w-5 text-destructive" />
          Faltas sem Justificativa
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {absences!.map((absence) => {
              const daysAgo = differenceInDays(new Date(), new Date(absence.date));
              const daysLeft = 7 - daysAgo;
              return (
                <div
                  key={absence.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {format(new Date(absence.date + "T12:00:00"), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {(absence as any).classes?.name || "Turma"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {daysLeft}d restantes
                    </span>
                    <Dialog open={dialogOpen && selectedAttendanceId === absence.id} onOpenChange={(open) => {
                      setDialogOpen(open);
                      if (open) setSelectedAttendanceId(absence.id);
                      else { setSelectedAttendanceId(""); setCategory(""); setDescription(""); setFile(null); }
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="text-xs h-7">
                          <FileText className="h-3 w-3 mr-1" />
                          Justificar
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Justificar Falta</DialogTitle>
                          <DialogDescription>Preencha os campos abaixo para justificar sua ausência.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-2">
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(absence.date + "T12:00:00"), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                            {" — "}
                            {(absence as any).classes?.name}
                          </div>
                          <div className="space-y-2">
                            <Label>Motivo *</Label>
                            <Select value={category} onValueChange={setCategory}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o motivo" />
                              </SelectTrigger>
                              <SelectContent>
                                {JUSTIFICATION_CATEGORIES.map(cat => (
                                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Detalhes (opcional)</Label>
                            <Textarea
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                              placeholder="Descreva brevemente o motivo..."
                              rows={3}
                              maxLength={500}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Anexo (opcional)</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="file"
                                accept="image/*,.pdf,.doc,.docx"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="text-xs"
                              />
                              {file && (
                                <Badge variant="secondary" className="text-xs flex-shrink-0">
                                  <Upload className="h-3 w-3 mr-1" />
                                  {file.name.length > 20 ? file.name.substring(0, 17) + "..." : file.name}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground">Atestado médico, declaração, etc.</p>
                          </div>
                          <Button
                            onClick={() => submitMutation.mutate()}
                            disabled={!category || submitMutation.isPending}
                            className="w-full"
                          >
                            {submitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Enviar Justificativa
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

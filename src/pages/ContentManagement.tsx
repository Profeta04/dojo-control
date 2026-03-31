import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { RequireApproval } from "@/components/auth/RequireApproval";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, BookOpen, Video, ClipboardCheck, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { cn } from "@/lib/utils";
import { useDojoContext } from "@/hooks/useDojoContext";
import { MaterialsManager } from "@/components/content/MaterialsManager";

type ContentTab = "apostilas" | "videos" | "simulados";

const BELT_OPTIONS = [
  "branca", "cinza", "azul", "amarela", "laranja", "verde", "roxa", "marrom",
  "preta_1dan", "preta_2dan", "preta_3dan",
];

export default function ContentManagement() {
  const { profile, loading, canManageStudents } = useAuth();
  const { currentDojoId } = useDojoContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ContentTab>("apostilas");

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  if (!canManageStudents) return <DashboardLayout><p>Acesso restrito.</p></DashboardLayout>;

  return (
    <RequireApproval>
      <DashboardLayout>
        <PageHeader title="Conteúdo Educacional" description="Gerencie apostilas, vídeos e simulados." />

        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-muted/50 mb-6">
          {([
            { key: "apostilas" as const, label: "Apostilas", icon: BookOpen },
            { key: "videos" as const, label: "Vídeos", icon: Video },
            { key: "simulados" as const, label: "Simulados", icon: ClipboardCheck },
          ]).map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "apostilas" && <MaterialsManager dojoId={currentDojoId} />}
        {/* Old MaterialsManager function below is no longer used for apostilas */}
        {activeTab === "videos" && <VideosManager dojoId={currentDojoId} />}
        {activeTab === "simulados" && <ExamsManager dojoId={currentDojoId} />}
      </DashboardLayout>
    </RequireApproval>
  );
}

function MaterialsManager({ dojoId }: { dojoId: string | null }) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: materials = [] } = useQuery({
    queryKey: ["study-materials-manage", dojoId],
    queryFn: async () => {
      let q = supabase.from("study_materials").select("*").order("created_at", { ascending: false });
      if (dojoId) q = q.eq("dojo_id", dojoId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile || !dojoId) return;
    setUploading(true);

    const form = new FormData(e.currentTarget);
    const title = form.get("title") as string;
    const description = form.get("description") as string;
    const belt = form.get("belt_level") as string;
    const file = form.get("file") as File | null;

    try {
      let file_url: string | null = null;
      if (file && file.size > 0) {
        const path = `${dojoId}/${Date.now()}_${file.name}`;
        const { error: upErr } = await supabase.storage.from("study-materials").upload(path, file);
        if (upErr) throw upErr;
        file_url = path;
      }

      const { error } = await supabase.from("study_materials").insert({
        dojo_id: dojoId,
        title,
        description,
        belt_level: belt,
        martial_art: "judo",
        type: file_url ? "pdf" : "embedded",
        file_url,
        created_by: profile.user_id,
      });
      if (error) throw error;

      toast({ title: "Apostila adicionada!" });
      queryClient.invalidateQueries({ queryKey: ["study-materials"] });
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const deleteMaterial = async (id: string) => {
    await supabase.from("study_materials").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["study-materials"] });
    toast({ title: "Apostila removida." });
  };

  return (
    <div className="space-y-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Adicionar Apostila</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Apostila</DialogTitle></DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            <div><Label>Título</Label><Input name="title" required /></div>
            <div><Label>Descrição</Label><Textarea name="description" /></div>
            <div>
              <Label>Faixa</Label>
              <Select name="belt_level" defaultValue="branca">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BELT_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Arquivo PDF</Label><Input name="file" type="file" accept=".pdf" /></div>
            <Button type="submit" disabled={uploading}>{uploading ? "Enviando..." : "Salvar"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {materials.map((m: any) => (
        <Card key={m.id}>
          <CardContent className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{m.title}</span>
              <BeltBadge grade={m.belt_level as any} size="sm" />
            </div>
            <Button variant="ghost" size="icon" onClick={() => deleteMaterial(m.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function VideosManager({ dojoId }: { dojoId: string | null }) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: videos = [] } = useQuery({
    queryKey: ["study-videos-manage", dojoId],
    queryFn: async () => {
      let q = supabase.from("study_videos").select("*").order("created_at", { ascending: false });
      if (dojoId) q = q.eq("dojo_id", dojoId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile || !dojoId) return;
    setSaving(true);

    const form = new FormData(e.currentTarget);
    try {
      const { error } = await supabase.from("study_videos").insert({
        dojo_id: dojoId,
        title: form.get("title") as string,
        description: form.get("description") as string,
        belt_level: form.get("belt_level") as string,
        martial_art: "judo",
        source: "youtube",
        video_url: form.get("video_url") as string,
        created_by: profile.user_id,
      });
      if (error) throw error;

      toast({ title: "Vídeo adicionado!" });
      queryClient.invalidateQueries({ queryKey: ["study-videos"] });
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteVideo = async (id: string) => {
    await supabase.from("study_videos").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["study-videos"] });
    toast({ title: "Vídeo removido." });
  };

  return (
    <div className="space-y-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Adicionar Vídeo</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Vídeo</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div><Label>Título</Label><Input name="title" required /></div>
            <div><Label>Descrição</Label><Textarea name="description" /></div>
            <div><Label>URL do YouTube</Label><Input name="video_url" required placeholder="https://youtube.com/watch?v=..." /></div>
            <div>
              <Label>Faixa</Label>
              <Select name="belt_level" defaultValue="branca">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BELT_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {videos.map((v: any) => (
        <Card key={v.id}>
          <CardContent className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{v.title}</span>
              <BeltBadge grade={v.belt_level as any} size="sm" />
            </div>
            <Button variant="ghost" size="icon" onClick={() => deleteVideo(v.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ExamsManager({ dojoId }: { dojoId: string | null }) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<{ question: string; options: string[]; correct_option: number }[]>([]);

  const { data: exams = [] } = useQuery({
    queryKey: ["exam-templates-manage", dojoId],
    queryFn: async () => {
      let q = supabase.from("exam_templates").select("*").order("created_at", { ascending: false });
      if (dojoId) q = q.eq("dojo_id", dojoId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const addQuestion = () => {
    setQuestions([...questions, { question: "", options: ["", "", "", ""], correct_option: 0 }]);
  };

  const updateQuestion = (idx: number, field: string, value: any) => {
    const updated = [...questions];
    if (field === "question") updated[idx].question = value;
    else if (field === "correct_option") updated[idx].correct_option = parseInt(value);
    else if (field.startsWith("option_")) {
      const oi = parseInt(field.split("_")[1]);
      updated[idx].options[oi] = value;
    }
    setQuestions(updated);
  };

  const removeQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile || !dojoId || questions.length === 0) return;
    setSaving(true);

    const form = new FormData(e.currentTarget);
    try {
      const { error } = await supabase.from("exam_templates").insert({
        dojo_id: dojoId,
        title: form.get("title") as string,
        martial_art: "judo",
        belt_level: form.get("belt_level") as string,
        difficulty: form.get("difficulty") as string,
        questions: questions as any,
        total_questions: questions.length,
        created_by: profile.user_id,
      });
      if (error) throw error;

      toast({ title: "Simulado criado!" });
      queryClient.invalidateQueries({ queryKey: ["exam-templates"] });
      setOpen(false);
      setQuestions([]);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteExam = async (id: string) => {
    await supabase.from("exam_templates").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["exam-templates"] });
    toast({ title: "Simulado removido." });
  };

  return (
    <div className="space-y-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Criar Simulado</Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Simulado</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div><Label>Título</Label><Input name="title" required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Faixa</Label>
                <Select name="belt_level" defaultValue="branca">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BELT_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Dificuldade</Label>
                <Select name="difficulty" defaultValue="medium">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Fácil</SelectItem>
                    <SelectItem value="medium">Médio</SelectItem>
                    <SelectItem value="hard">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Questões ({questions.length})</Label>
                <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                  <Plus className="h-3 w-3 mr-1" /> Questão
                </Button>
              </div>
              {questions.map((q, qi) => (
                <Card key={qi}>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Questão {qi + 1}</Label>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeQuestion(qi)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Pergunta..."
                      value={q.question}
                      onChange={e => updateQuestion(qi, "question", e.target.value)}
                      required
                    />
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct_${qi}`}
                          checked={q.correct_option === oi}
                          onChange={() => updateQuestion(qi, "correct_option", oi)}
                          className="accent-primary"
                        />
                        <Input
                          placeholder={`Opção ${String.fromCharCode(65 + oi)}`}
                          value={opt}
                          onChange={e => updateQuestion(qi, `option_${oi}`, e.target.value)}
                          required
                          className="text-sm"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button type="submit" disabled={saving || questions.length === 0} className="w-full">
              {saving ? "Salvando..." : "Criar Simulado"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {exams.map((ex: any) => (
        <Card key={ex.id}>
          <CardContent className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{ex.title}</span>
              <Badge variant="outline" className="text-[10px]">{ex.total_questions} questões</Badge>
              <BeltBadge grade={ex.belt_level as any} size="sm" />
            </div>
            <Button variant="ghost" size="icon" onClick={() => deleteExam(ex.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

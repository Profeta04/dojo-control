import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus, Trash2, FileText, Upload, Eye, EyeOff, ImageIcon,
  BookOpen, Loader2, CheckCircle2, AlertCircle, FilePlus2
} from "lucide-react";

const BELT_OPTIONS = [
  "branca", "cinza", "azul", "amarela", "laranja", "verde", "roxa", "marrom",
  "preta_1dan", "preta_2dan", "preta_3dan",
];

interface ParseResult {
  markdown: string;
  title: string;
  pageCount: number;
  imageCount: number;
  hasImages: boolean;
}

type CreateMode = "new" | "append";

export function MaterialsManager({ dojoId }: { dojoId: string | null }) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [includeImages, setIncludeImages] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>("new");
  const [selectedExistingId, setSelectedExistingId] = useState<string>("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [selectedBelt, setSelectedBelt] = useState("branca");
  const [editedMarkdown, setEditedMarkdown] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: materials = [], refetch } = useQuery({
    queryKey: ["study-materials-manage", dojoId],
    queryFn: async () => {
      let q = supabase.from("study_materials").select("*").order("created_at", { ascending: false });
      if (dojoId) q = q.eq("dojo_id", dojoId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const resetForm = () => {
    setParseResult(null);
    setParseProgress(0);
    setParsing(false);
    setUploading(false);
    setIncludeImages(false);
    setCreateMode("new");
    setSelectedExistingId("");
    setManualTitle("");
    setManualDescription("");
    setSelectedBelt("branca");
    setEditedMarkdown("");
    setSelectedFile(null);
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo de 20MB.", variant: "destructive" });
      return;
    }

    if (file.type !== "application/pdf") {
      toast({ title: "Formato inválido", description: "Apenas PDFs.", variant: "destructive" });
      return;
    }

    setSelectedFile(file);
    setParsing(true);
    setParseProgress(20);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("include_images", includeImages ? "true" : "false");

      setParseProgress(50);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/parse-pdf`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      setParseProgress(80);

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || "Erro ao processar PDF");
      }

      const result: ParseResult = await resp.json();
      setParseResult(result);
      setManualTitle(result.title);
      setEditedMarkdown(result.markdown);
      setParseProgress(100);

      toast({ title: "PDF processado!", description: `${result.pageCount} página(s) extraída(s).` });
    } catch (err: any) {
      toast({ title: "Erro no processamento", description: err.message, variant: "destructive" });
      setParseResult(null);
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!profile || !dojoId) return;
    setUploading(true);

    try {
      // Also upload PDF to storage
      let file_url: string | null = null;
      if (selectedFile) {
        const path = `${dojoId}/${Date.now()}_${selectedFile.name}`;
        const { error: upErr } = await supabase.storage.from("study-materials").upload(path, selectedFile);
        if (upErr) throw upErr;
        file_url = path;
      }

      if (createMode === "append" && selectedExistingId) {
        // Append content to existing material
        const existing = materials.find((m: any) => m.id === selectedExistingId);
        if (!existing) throw new Error("Apostila não encontrada");

        const separator = "\n\n---\n\n";
        const newContent = (existing.content || "") + separator + editedMarkdown;

        const { error } = await supabase
          .from("study_materials")
          .update({ content: newContent, updated_at: new Date().toISOString() } as any)
          .eq("id", selectedExistingId);
        if (error) throw error;

        toast({ title: "Conteúdo adicionado à apostila!" });
      } else {
        // Create new
        const { error } = await supabase.from("study_materials").insert({
          dojo_id: dojoId,
          title: manualTitle || "Nova Apostila",
          description: manualDescription || null,
          belt_level: selectedBelt,
          martial_art: "judo",
          type: editedMarkdown ? "embedded" : "pdf",
          content: editedMarkdown || null,
          file_url,
          created_by: profile.user_id,
        });
        if (error) throw error;

        toast({ title: "Apostila criada!" });
      }

      queryClient.invalidateQueries({ queryKey: ["study-materials"] });
      queryClient.invalidateQueries({ queryKey: ["study-materials-manage"] });
      setOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleManualSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile || !dojoId) return;
    setUploading(true);

    const form = new FormData(e.currentTarget);
    const title = form.get("title") as string;
    const description = form.get("description") as string;
    const belt = selectedBelt;
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
      queryClient.invalidateQueries({ queryKey: ["study-materials-manage"] });
      setOpen(false);
      resetForm();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const toggleVisibility = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from("study_materials")
      .update({ is_active: !currentActive } as any)
      .eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["study-materials-manage"] });
    toast({ title: !currentActive ? "Apostila ativada" : "Apostila ocultada" });
  };

  const deleteMaterial = async (id: string) => {
    await supabase.from("study_materials").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["study-materials"] });
    queryClient.invalidateQueries({ queryKey: ["study-materials-manage"] });
    toast({ title: "Apostila removida." });
  };

  const [dialogMode, setDialogMode] = useState<"pdf" | "manual">("pdf");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => { setDialogMode("pdf"); setOpen(true); }}>
              <Upload className="h-4 w-4 mr-1" /> Upload PDF
            </Button>
          </DialogTrigger>
          <Button size="sm" variant="outline" onClick={() => { setDialogMode("manual"); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Manual
          </Button>

          <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-0">
            <ScrollArea className="max-h-[85vh]">
              <div className="p-6">
                {dialogMode === "pdf" ? (
                  <>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5 text-primary" />
                        Criar Apostila a partir de PDF
                      </DialogTitle>
                    </DialogHeader>

                    <div className="mt-4 space-y-4">
                      {/* Step 1: Mode selection */}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={createMode === "new" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCreateMode("new")}
                        >
                          <BookOpen className="h-4 w-4 mr-1" /> Nova Apostila
                        </Button>
                        <Button
                          type="button"
                          variant={createMode === "append" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCreateMode("append")}
                        >
                          <FilePlus2 className="h-4 w-4 mr-1" /> Adicionar a Existente
                        </Button>
                      </div>

                      {createMode === "append" && (
                        <div>
                          <Label>Selecionar Apostila</Label>
                          <Select value={selectedExistingId} onValueChange={setSelectedExistingId}>
                            <SelectTrigger><SelectValue placeholder="Escolha uma apostila..." /></SelectTrigger>
                            <SelectContent>
                              {materials
                                .filter((m: any) => m.type === "embedded" && m.content)
                                .map((m: any) => (
                                  <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Step 2: Options */}
                      <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Incluir imagens do PDF</p>
                            <p className="text-xs text-muted-foreground">Extrair referências de imagens</p>
                          </div>
                        </div>
                        <Switch checked={includeImages} onCheckedChange={setIncludeImages} />
                      </div>

                      {/* Step 3: Upload */}
                      <div>
                        <Label>Arquivo PDF (máx 20MB)</Label>
                        <div className="mt-1 border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                          <input
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            id="pdf-upload"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleFileSelect(f);
                            }}
                          />
                          <label htmlFor="pdf-upload" className="cursor-pointer">
                            {parsing ? (
                              <div className="space-y-2">
                                <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground">Processando PDF...</p>
                                <Progress value={parseProgress} className="h-2 max-w-xs mx-auto" />
                              </div>
                            ) : selectedFile && parseResult ? (
                              <div className="space-y-1">
                                <CheckCircle2 className="h-8 w-8 mx-auto text-green-500" />
                                <p className="text-sm font-medium">{selectedFile.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {parseResult.pageCount} página(s) • {parseResult.hasImages ? `${parseResult.imageCount} imagens` : "Sem imagens"}
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Clique para selecionar um PDF</p>
                                <p className="text-xs text-muted-foreground">PDF com texto selecionável</p>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>

                      {/* Step 4: Preview & edit */}
                      {parseResult && (
                        <>
                          {createMode === "new" && (
                            <div className="grid gap-3">
                              <div>
                                <Label>Título</Label>
                                <Input value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} />
                              </div>
                              <div>
                                <Label>Descrição</Label>
                                <Input value={manualDescription} onChange={(e) => setManualDescription(e.target.value)} placeholder="Opcional" />
                              </div>
                              <div>
                                <Label>Faixa</Label>
                                <Select value={selectedBelt} onValueChange={setSelectedBelt}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {BELT_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <Label>Conteúdo extraído (editável)</Label>
                              <Badge variant="outline" className="text-[10px]">Markdown</Badge>
                            </div>
                            <Textarea
                              value={editedMarkdown}
                              onChange={(e) => setEditedMarkdown(e.target.value)}
                              className="min-h-[200px] font-mono text-xs"
                            />
                          </div>

                          {!editedMarkdown.trim() && (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                              <AlertCircle className="h-4 w-4" />
                              <span>Não foi possível extrair texto. O PDF pode conter apenas imagens escaneadas.</span>
                            </div>
                          )}

                          <Button
                            onClick={handleSave}
                            disabled={uploading || (!editedMarkdown.trim() && createMode === "new")}
                            className="w-full"
                          >
                            {uploading ? (
                              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Salvando...</>
                            ) : createMode === "append" ? (
                              <><FilePlus2 className="h-4 w-4 mr-1" /> Adicionar Conteúdo</>
                            ) : (
                              <><BookOpen className="h-4 w-4 mr-1" /> Criar Apostila</>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5 text-primary" />
                        Nova Apostila Manual
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleManualSave} className="mt-4 space-y-4">
                      <div><Label>Título</Label><Input name="title" required /></div>
                      <div><Label>Descrição</Label><Textarea name="description" /></div>
                      <div>
                        <Label>Faixa</Label>
                        <Select value={selectedBelt} onValueChange={setSelectedBelt}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {BELT_OPTIONS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Arquivo PDF (opcional)</Label><Input name="file" type="file" accept=".pdf" /></div>
                      <Button type="submit" disabled={uploading} className="w-full">
                        {uploading ? "Enviando..." : "Salvar"}
                      </Button>
                    </form>
                  </>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      {/* Materials list */}
      {materials.map((m: any) => (
        <Card key={m.id} className={!m.is_active ? "opacity-60" : ""}>
          <CardContent className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium truncate">{m.title}</span>
              <BeltBadge grade={m.belt_level as any} size="sm" />
              {m.type === "embedded" && m.content && (
                <Badge variant="outline" className="text-[10px] shrink-0">📝 Texto</Badge>
              )}
              {!m.is_active && (
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  <EyeOff className="h-3 w-3 mr-0.5" /> Oculta
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => toggleVisibility(m.id, m.is_active !== false)}
                title={m.is_active !== false ? "Ocultar" : "Mostrar"}
              >
                {m.is_active !== false ? (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMaterial(m.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

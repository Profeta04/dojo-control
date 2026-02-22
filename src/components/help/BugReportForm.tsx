import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Send, ImagePlus, X, Loader2 } from "lucide-react";

export function BugReportForm() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB");
      return;
    }
    setScreenshot(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !description.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    try {
      let screenshotUrl: string | null = null;

      if (screenshot) {
        const ext = screenshot.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("bug-screenshots")
          .upload(path, screenshot);
        if (uploadError) throw uploadError;
        screenshotUrl = path;
      }

      const { error } = await supabase.from("bug_reports").insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        screenshot_url: screenshotUrl,
      });

      if (error) throw error;

      toast.success("Relato enviado com sucesso! Obrigado pelo feedback.");
      setTitle("");
      setDescription("");
      removeScreenshot();
    } catch (err: any) {
      toast.error("Erro ao enviar relato: " + (err.message || "Tente novamente"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Encontrou um problema? Descreva o que aconteceu e nossa equipe irá analisar.
      </p>

      <div className="space-y-2">
        <Label htmlFor="bug-title">Título *</Label>
        <Input
          id="bug-title"
          placeholder="Ex: Botão de pagamento não funciona"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bug-desc">Descrição *</Label>
        <Textarea
          id="bug-desc"
          placeholder="Descreva o problema com detalhes: o que você estava fazendo, o que esperava que acontecesse e o que aconteceu de fato."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
          rows={4}
          required
        />
        <p className="text-xs text-muted-foreground text-right">{description.length}/1000</p>
      </div>

      <div className="space-y-2">
        <Label>Captura de tela (opcional)</Label>
        {previewUrl ? (
          <div className="relative inline-block">
            <img
              src={previewUrl}
              alt="Screenshot preview"
              className="max-h-40 rounded-lg border border-border"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={removeScreenshot}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors border border-dashed border-border rounded-lg p-4">
            <ImagePlus className="h-5 w-5" />
            <span>Clique para anexar uma imagem</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleScreenshot}
            />
          </label>
        )}
      </div>

      <Button type="submit" disabled={loading || !title.trim() || !description.trim()} className="w-full">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Send className="h-4 w-4 mr-2" />
        )}
        Enviar Relato
      </Button>
    </form>
  );
}

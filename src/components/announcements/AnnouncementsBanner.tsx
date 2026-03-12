import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDojoContext } from "@/hooks/useDojoContext";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  uploadAnnouncementFile,
  notifyDojoStudents,
  Announcement,
} from "@/services/announcementsService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  AlertTriangle,
  Pin,
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  CalendarClock,
  Image,
  Paperclip,
  FileText,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export function AnnouncementsBanner() {
  const { currentDojoId } = useDojoContext();
  const { user, profile, canManageStudents } = useAuth();
  const queryClient = useQueryClient();
  const dojoId = currentDojoId || profile?.dojo_id || "";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const updateHeight = useCallback(() => {
    if (!carouselApi) return;
    const idx = carouselApi.selectedScrollSnap();
    setSelectedIndex(idx);
    const slide = carouselApi.slideNodes()[idx];
    const viewport = carouselApi.rootNode();

    if (slide && viewport) {
      const h = slide.getBoundingClientRect().height;
      viewport.style.transition = "height 0.4s cubic-bezier(0.4, 0, 0.2, 1)";
      viewport.style.height = `${h}px`;
    }
  }, [carouselApi]);

  useEffect(() => {
    if (!carouselApi) return;

    updateHeight();
    carouselApi.on("select", updateHeight);
    carouselApi.on("reInit", updateHeight);

    return () => {
      carouselApi.off("select", updateHeight);
      carouselApi.off("reInit", updateHeight);
      const viewport = carouselApi.rootNode();
      if (viewport) {
        viewport.style.height = "";
        viewport.style.transition = "";
      }
    };
  }, [carouselApi, updateHeight]);

  const { data: announcements } = useQuery({
    queryKey: ["announcements", dojoId],
    queryFn: () => fetchAnnouncements(dojoId),
    enabled: !!dojoId,
    staleTime: 1000 * 60 * 2,
  });

  const createMutation = useMutation({
    mutationFn: async (form: FormState) => {
      let imageUrl: string | null = null;
      let fileUrl: string | null = null;
      if (form.imageFile) {
        imageUrl = await uploadAnnouncementFile(form.imageFile);
      }
      if (form.attachFile) {
        fileUrl = await uploadAnnouncementFile(form.attachFile);
      }
      const ann = await createAnnouncement({
        dojo_id: dojoId,
        created_by: user!.id,
        title: form.title,
        content: form.content,
        image_url: imageUrl,
        file_url: fileUrl,
        is_urgent: form.isUrgent,
        is_pinned: form.isPinned,
        expires_at: form.expiresAt || null,
      });
      await notifyDojoStudents(
        dojoId,
        form.isUrgent ? `🚨 ${form.title}` : `📢 ${form.title}`,
        form.content.substring(0, 200)
      );
      return ann;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setDialogOpen(false);
      toast.success("Aviso publicado!");
    },
    onError: () => toast.error("Erro ao publicar aviso."),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: FormState }) => {
      let imageUrl: string | null | undefined = undefined;
      let fileUrl: string | null | undefined = undefined;
      if (form.imageFile) {
        imageUrl = await uploadAnnouncementFile(form.imageFile);
      }
      if (form.attachFile) {
        fileUrl = await uploadAnnouncementFile(form.attachFile);
      }
      return updateAnnouncement(id, {
        title: form.title,
        content: form.content,
        ...(imageUrl !== undefined ? { image_url: imageUrl } : {}),
        ...(fileUrl !== undefined ? { file_url: fileUrl } : {}),
        is_urgent: form.isUrgent,
        is_pinned: form.isPinned,
        expires_at: form.expiresAt || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setDialogOpen(false);
      setEditing(null);
      toast.success("Aviso atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar aviso."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Aviso removido.");
    },
    onError: () => toast.error("Erro ao remover aviso."),
  });

  const allAnnouncements = announcements || [];
  const hasAnnouncements = allAnnouncements.length > 0;

  if (!dojoId) return null;
  if (!hasAnnouncements && !canManageStudents) return null;

  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-destructive/10">
              <Megaphone className="h-5 w-5 text-destructive" />
            </div>
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Mural de Avisos
            </span>
          </CardTitle>
          {canManageStudents && (
            <Dialog
              open={dialogOpen}
              onOpenChange={(o) => {
                setDialogOpen(o);
                if (!o) setEditing(null);
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" /> Novo Aviso
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editing ? "Editar Aviso" : "Novo Aviso"}
                  </DialogTitle>
                </DialogHeader>
                <AnnouncementForm
                  initial={editing}
                  loading={
                    createMutation.isPending || updateMutation.isPending
                  }
                  onSubmit={(form) => {
                    if (editing) {
                      updateMutation.mutate({ id: editing.id, form });
                    } else {
                      createMutation.mutate(form);
                    }
                  }}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasAnnouncements ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum aviso publicado. Clique em "Novo Aviso" para criar um.
          </p>
        ) : (
          <Carousel
            opts={{ align: "start", loop: allAnnouncements.length > 1 }}
            className="w-full"
            setApi={setCarouselApi}
          >
            <CarouselContent className="items-start">
              {allAnnouncements.map((ann) => (
                <CarouselItem key={ann.id} className="md:basis-1/2 lg:basis-1/2">
                  <div
                    className={`rounded-lg border p-3 ${
                      ann.is_urgent
                        ? "border-destructive/50 bg-destructive/5"
                        : "border-border/60 bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        {ann.is_urgent && (
                          <Badge variant="destructive" className="gap-1 text-xs">
                            <AlertTriangle className="h-3 w-3" /> Urgente
                          </Badge>
                        )}
                        {ann.is_pinned && (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Pin className="h-3 w-3" /> Fixado
                          </Badge>
                        )}
                        <span className="font-semibold text-sm">{ann.title}</span>
                      </div>
                      {canManageStudents && (
                        <div className="flex gap-0.5 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditing(ann);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover aviso?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(ann.id)}
                                >
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                    {!ann.image_url && ann.content && (
                      <p className="text-xs text-foreground/80 mt-1.5 whitespace-pre-wrap">
                        {ann.content}
                      </p>
                    )}
                    {ann.image_url && (
                      <img
                        src={ann.image_url}
                        alt=""
                        className="mt-2 rounded-md w-full object-contain max-h-64"
                        loading="lazy"
                        onLoad={updateHeight}
                      />
                    )}
                    {ann.image_url && ann.content && (
                      <p className="text-xs text-foreground/80 mt-1.5 whitespace-pre-wrap">
                        {ann.content}
                      </p>
                    )}
                    {ann.file_url && (
                      <a
                        href={ann.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-2 text-xs text-primary hover:underline bg-primary/5 rounded-md px-2.5 py-2 border border-primary/20"
                      >
                        <FileText className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate flex-1">
                          {getFileName(ann.file_url)}
                        </span>
                        <Download className="h-3.5 w-3.5 flex-shrink-0" />
                      </a>
                    )}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {allAnnouncements.length > 1 && (
              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-1.5 items-center">
                  {allAnnouncements.map((_, i) => (
                    <button
                      key={i}
                      className={`rounded-full transition-all duration-300 ${
                        i === selectedIndex
                          ? "w-5 h-2 bg-primary"
                          : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                      }`}
                      onClick={() => carouselApi?.scrollTo(i)}
                      aria-label={`Ir para aviso ${i + 1}`}
                    />
                  ))}
                </div>
                <div className="flex gap-1">
                  <CarouselPrevious className="static translate-y-0 h-7 w-7" />
                  <CarouselNext className="static translate-y-0 h-7 w-7" />
                </div>
              </div>
            )}
          </Carousel>
        )}
      </CardContent>
    </Card>
  );
}

function getFileName(url: string): string {
  try {
    const parts = url.split("/");
    const last = parts[parts.length - 1];
    // Remove UUID prefix if present (format: uuid.ext)
    const dotIdx = last.lastIndexOf(".");
    if (dotIdx > 0) {
      const ext = last.substring(dotIdx);
      return `Arquivo anexo${ext}`;
    }
    return "Arquivo anexo";
  } catch {
    return "Arquivo anexo";
  }
}

interface FormState {
  title: string;
  content: string;
  isUrgent: boolean;
  isPinned: boolean;
  expiresAt: string;
  imageFile: File | null;
  attachFile: File | null;
}

function AnnouncementForm({
  initial,
  loading,
  onSubmit,
}: {
  initial: Announcement | null;
  loading: boolean;
  onSubmit: (form: FormState) => void;
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [content, setContent] = useState(initial?.content || "");
  const [isUrgent, setIsUrgent] = useState(initial?.is_urgent || false);
  const [isPinned, setIsPinned] = useState(initial?.is_pinned || false);
  const [expiresAt, setExpiresAt] = useState(
    initial?.expires_at ? initial.expires_at.split("T")[0] : ""
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(
    initial?.image_url || null
  );
  const [attachName, setAttachName] = useState<string | null>(
    initial?.file_url ? getFileName(initial.file_url) : null
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const attachRef = useRef<HTMLInputElement>(null);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Máximo: 10MB.");
        return;
      }
      setAttachFile(file);
      setAttachName(file.name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Preencha o título.");
      return;
    }
    onSubmit({ title, content, isUrgent, isPinned, expiresAt, imageFile, attachFile });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ann-title">Título</Label>
        <Input
          id="ann-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título do aviso"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ann-content">Conteúdo</Label>
        <Textarea
          id="ann-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escreva o conteúdo do aviso (opcional)..."
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label>Imagem (opcional)</Label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleImage}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          className="gap-2 w-full"
        >
          <Image className="h-4 w-4" />{" "}
          {preview ? "Trocar imagem" : "Adicionar foto"}
        </Button>
        {preview && (
          <img
            src={preview}
            alt="Preview"
            className="rounded-lg max-h-32 object-cover w-full mt-2"
          />
        )}
      </div>
      <div className="space-y-2">
        <Label>Arquivo anexo (opcional)</Label>
        <input
          ref={attachRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
          onChange={handleAttach}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => attachRef.current?.click()}
          className="gap-2 w-full"
        >
          <Paperclip className="h-4 w-4" />{" "}
          {attachName ? "Trocar arquivo" : "Anexar arquivo"}
        </Button>
        {attachName && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 mt-1">
            <FileText className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{attachName}</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <Label
          htmlFor="ann-urgent"
          className="flex items-center gap-2 cursor-pointer"
        >
          <AlertTriangle className="h-4 w-4 text-destructive" /> Urgente
        </Label>
        <Switch
          id="ann-urgent"
          checked={isUrgent}
          onCheckedChange={setIsUrgent}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label
          htmlFor="ann-pinned"
          className="flex items-center gap-2 cursor-pointer"
        >
          <Pin className="h-4 w-4" /> Fixar no topo
        </Label>
        <Switch
          id="ann-pinned"
          checked={isPinned}
          onCheckedChange={setIsPinned}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ann-expires" className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4" /> Expiração (opcional)
        </Label>
        <Input
          id="ann-expires"
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading
          ? "Publicando..."
          : initial
          ? "Salvar alterações"
          : "Publicar aviso"}
      </Button>
    </form>
  );
}

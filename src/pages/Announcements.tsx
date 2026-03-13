import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDojoContext } from "@/hooks/useDojoContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { Plus, Pencil, Trash2, AlertTriangle, Image, CalendarClock, Megaphone } from "lucide-react";
import {
  fetchAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  uploadAnnouncementFile,
  notifyDojoStudents,
  Announcement,
} from "@/services/announcementsService";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Announcements() {
  const { user, canManageStudents } = useAuth();
  const { currentDojoId } = useDojoContext();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);

  const dojoId = currentDojoId || "";

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["announcements", dojoId],
    queryFn: () => fetchAnnouncements(dojoId),
    enabled: !!dojoId,
  });

  const createMutation = useMutation({
    mutationFn: async (form: FormState) => {
      let imageUrl: string | null = null;
      if (form.imageFile) {
        imageUrl = await uploadAnnouncementFile(form.imageFile);
      }
      const ann = await createAnnouncement({
        dojo_id: dojoId,
        created_by: user!.id,
        title: form.title,
        content: form.content,
        image_url: imageUrl,
        is_urgent: form.isUrgent,
        is_pinned: false,
        expires_at: form.expiresAt || null,
      });
      // Notify students
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
      toast.success("Aviso publicado com sucesso!");
    },
    onError: () => toast.error("Erro ao publicar aviso."),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: FormState }) => {
      let imageUrl: string | null | undefined = undefined;
      if (form.imageFile) {
        imageUrl = await uploadAnnouncementFile(form.imageFile);
      }
      return updateAnnouncement(id, {
        title: form.title,
        content: form.content,
        ...(imageUrl !== undefined ? { image_url: imageUrl } : {}),
        is_urgent: form.isUrgent,
        is_pinned: false,
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

  if (!dojoId) {
    return (
      <DashboardLayout>
        <PageHeader title="Mural de Avisos" description="Selecione um dojo para ver os avisos." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <PageHeader title="Mural de Avisos" description="Comunicados e avisos do dojo" />
        {canManageStudents && (
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Novo Aviso
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Aviso" : "Novo Aviso"}</DialogTitle>
              </DialogHeader>
              <AnnouncementForm
                initial={editing}
                loading={createMutation.isPending || updateMutation.isPending}
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

      {isLoading ? (
        <LoadingSpinner />
      ) : !announcements || announcements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Megaphone className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Nenhum aviso publicado ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <Card
              key={ann.id}
              className={ann.is_urgent ? "border-destructive/50 bg-destructive/5" : ""}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {ann.is_urgent && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" /> Urgente
                      </Badge>
                    )}
                    {ann.is_pinned && (
                      <Badge variant="secondary" className="gap-1">
                        <Pin className="h-3 w-3" /> Fixado
                      </Badge>
                    )}
                    <CardTitle className="text-lg">{ann.title}</CardTitle>
                  </div>
                  {canManageStudents && (
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(ann);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
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
                            <AlertDialogAction onClick={() => deleteMutation.mutate(ann.id)}>
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!ann.image_url && ann.content && (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{ann.content}</p>
                )}
                {ann.image_url && (
                  <img
                    src={ann.image_url}
                    alt="Imagem do aviso"
                    className="mt-1 rounded-lg max-h-64 object-cover w-full"
                    loading="lazy"
                  />
                )}
                {ann.image_url && ann.content && (
                  <p className="text-sm text-foreground whitespace-pre-wrap mt-2">{ann.content}</p>
                )}
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <span>Por {ann.author_name}</span>
                  <span>•</span>
                  <span>{format(new Date(ann.created_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  {ann.expires_at && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        Expira {format(new Date(ann.expires_at), "dd/MM/yyyy")}
                      </span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

interface FormState {
  title: string;
  content: string;
  isUrgent: boolean;
  isPinned: boolean;
  expiresAt: string;
  imageFile: File | null;
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
  const [preview, setPreview] = useState<string | null>(initial?.image_url || null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Preencha o título.");
      return;
    }
    onSubmit({ title, content, isUrgent, isPinned, expiresAt, imageFile });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título do aviso"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">Conteúdo (opcional)</Label>
        <Textarea
          id="content"
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
          onChange={handleFile}
          className="hidden"
        />
        <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="gap-2 w-full">
          <Image className="h-4 w-4" /> {preview ? "Trocar imagem" : "Adicionar foto"}
        </Button>
        {preview && (
          <img src={preview} alt="Preview" className="rounded-lg max-h-32 object-cover w-full mt-2" />
        )}
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="urgent" className="flex items-center gap-2 cursor-pointer">
          <AlertTriangle className="h-4 w-4 text-destructive" /> Urgente
        </Label>
        <Switch id="urgent" checked={isUrgent} onCheckedChange={setIsUrgent} />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="pinned" className="flex items-center gap-2 cursor-pointer">
          <Pin className="h-4 w-4" /> Fixar no topo
        </Label>
        <Switch id="pinned" checked={isPinned} onCheckedChange={setIsPinned} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="expires" className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4" /> Data de expiração (opcional)
        </Label>
        <Input
          id="expires"
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Publicando..." : initial ? "Salvar alterações" : "Publicar aviso"}
      </Button>
    </form>
  );
}

import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function AvatarUpload() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: avatarUrl } = useQuery({
    queryKey: ["avatar-url", profile?.avatar_url],
    queryFn: async () => {
      if (!profile?.avatar_url) return null;
      const { data } = supabase.storage.from("avatars").getPublicUrl(profile.avatar_url);
      return data.publicUrl;
    },
    enabled: !!profile?.avatar_url,
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${ext}`;

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        await supabase.storage.from("avatars").remove([profile.avatar_url]);
      }

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: filePath })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["avatar-url"] });
      queryClient.invalidateQueries({ queryKey: ["auth-profile"] });
      toast.success("Foto atualizada!");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error("Erro ao enviar foto");
    } finally {
      setUploading(false);
    }
  };

  const initials = profile?.name?.charAt(0).toUpperCase() || "?";

  return (
    <div className="relative group">
      <div className="w-28 h-28 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center ring-4 ring-primary/20">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Foto de perfil"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-4xl font-bold text-primary">{initials}</span>
        )}
      </div>

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className={cn(
          "absolute bottom-0 right-0 w-9 h-9 rounded-full bg-primary text-primary-foreground",
          "flex items-center justify-center shadow-lg",
          "transition-all hover:scale-110 active:scale-95",
          "disabled:opacity-50"
        )}
        aria-label="Alterar foto de perfil"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}

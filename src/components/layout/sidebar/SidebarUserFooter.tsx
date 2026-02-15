import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { LogOut, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarBeltDialog } from "./SidebarBeltDialog";

export function SidebarUserFooter() {
  const navigate = useNavigate();
  const { profile, signOut, isDono, isAdmin, isSensei, isStudent, canManageStudents } = useAuth();
  const { getSignedUrl } = useSignedUrl();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [beltDialogOpen, setBeltDialogOpen] = useState(false);

  useEffect(() => {
    const loadAvatar = async () => {
      if (!profile?.avatar_url) { setAvatarUrl(null); return; }
      if (profile.avatar_url.startsWith("http")) {
        setAvatarUrl(profile.avatar_url);
      } else {
        const signed = await getSignedUrl("avatars", profile.avatar_url);
        if (signed) { setAvatarUrl(signed); }
        else {
          const { data } = supabase.storage.from("avatars").getPublicUrl(profile.avatar_url);
          setAvatarUrl(data?.publicUrl || null);
        }
      }
    };
    loadAvatar();
  }, [profile?.avatar_url, getSignedUrl]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const roleLabel = isDono ? "Dono" : isAdmin ? "Admin" : isSensei ? "Sensei" : "Aluno";

  return (
    <>
      <div className="p-3 safe-area-inset-bottom" role="region" aria-label="Informações do usuário">
        <div className="flex items-center gap-3 mb-2.5 px-1">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className={cn(
              "w-9 h-9 rounded-full overflow-hidden flex items-center justify-center",
              "ring-2 ring-sidebar-border/50 transition-all duration-200",
              avatarUrl ? "" : "bg-sidebar-accent"
            )}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={profile?.name || "Avatar"} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sidebar-accent-foreground font-semibold text-sm">
                  {profile?.name?.charAt(0).toUpperCase() || "U"}
                </span>
              )}
            </div>
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-sidebar-foreground truncate leading-tight">
              {profile?.name || "Usuário"}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {profile?.belt_grade && (
                isSensei ? (
                  <button
                    onClick={() => setBeltDialogOpen(true)}
                    className="flex items-center gap-0.5 hover:opacity-80 transition-opacity"
                    title="Alterar faixa"
                  >
                    <BeltBadge grade={profile.belt_grade as any} size="sm" />
                    <Pencil className="h-2.5 w-2.5 text-sidebar-foreground/40" />
                  </button>
                ) : (
                  <BeltBadge grade={profile.belt_grade as any} size="sm" />
                )
              )}
              <span className="text-[11px] text-sidebar-foreground/50 font-medium">{roleLabel}</span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start h-9 text-[13px] text-sidebar-foreground/60",
            "hover:text-destructive hover:bg-destructive/10",
            "active:scale-[0.98] transition-all duration-200",
            "focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          )}
          onClick={handleSignOut}
          aria-label="Sair da conta"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>

      <SidebarBeltDialog open={beltDialogOpen} onOpenChange={setBeltDialogOpen} />
    </>
  );
}

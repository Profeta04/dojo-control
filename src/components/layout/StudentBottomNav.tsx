import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { LayoutDashboard, ClipboardList, Calendar, CreditCard, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

const studentTabs = [
  { title: "Dashboard", href: "/perfil", icon: LayoutDashboard },
  { title: "Tarefas", href: "/tarefas", icon: ClipboardList },
  { title: "Config", href: "/config", icon: Settings, isProfile: true },
  { title: "Agenda", href: "/agenda", icon: Calendar },
  { title: "Mensalidade", href: "/mensalidade", icon: CreditCard },
];

export function StudentBottomNav() {
  const location = useLocation();
  const { profile } = useAuth();
  const { getSignedUrl } = useSignedUrl();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadAvatar = async () => {
      if (!profile?.avatar_url) {
        setAvatarUrl(null);
        return;
      }
      if (profile.avatar_url.startsWith("http")) {
        setAvatarUrl(profile.avatar_url);
      } else {
        const signed = await getSignedUrl("avatars", profile.avatar_url);
        if (signed) {
          setAvatarUrl(signed);
        } else {
          const { data } = supabase.storage.from("avatars").getPublicUrl(profile.avatar_url);
          setAvatarUrl(data?.publicUrl || null);
        }
      }
    };
    loadAvatar();
  }, [profile?.avatar_url, getSignedUrl]);

  return (
    <nav
      id="student-bottom-nav"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t border-sidebar-border safe-area-inset-bottom"
      aria-label="Navegação do aluno"
    >
      <div className="flex items-end justify-around px-1 pt-1.5 pb-1.5">
        {studentTabs.map((tab) => {
          const isActive = location.pathname === tab.href;
          const Icon = tab.icon;

          // Profile/Config tab shows avatar
          if (tab.isProfile) {
            return (
              <Link
                key={tab.href}
                to={tab.href}
                className="flex flex-col items-center -mt-5 relative px-2"
                aria-current={isActive ? "page" : undefined}
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 overflow-hidden",
                    "shadow-md border-[3px] border-sidebar",
                    isActive
                      ? "ring-2 ring-primary ring-offset-1 ring-offset-sidebar scale-110"
                      : "ring-1 ring-sidebar-border hover:scale-105"
                  )}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={profile?.name || "Avatar"}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className={cn(
                      "text-sm font-bold",
                      isActive ? "text-primary" : "text-sidebar-foreground/60"
                    )}>
                      {profile?.name?.charAt(0).toUpperCase() || "U"}
                    </span>
                  )}
                </div>
                {profile?.belt_grade && (
                  <div className="mt-0.5 animate-scale-in">
                    <BeltBadge grade={profile.belt_grade as any} size="sm" />
                  </div>
                )}
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all duration-200 min-w-[52px]",
                isActive
                  ? "text-primary"
                  : "text-sidebar-foreground/50 hover:text-sidebar-foreground/80"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "h-5 w-5 transition-all duration-200",
                    isActive && "scale-110"
                  )}
                />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary animate-scale-in" />
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-all duration-200",
                isActive && "font-semibold"
              )}>
                {tab.title}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

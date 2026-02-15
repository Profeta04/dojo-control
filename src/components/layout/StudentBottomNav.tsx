import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { BeltBadge } from "@/components/shared/BeltBadge";
import {
  LayoutDashboard,
  ClipboardList,
  Calendar,
  CreditCard,
  Settings,
  Users,
  GraduationCap,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface TabItem {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
  isProfile?: boolean;
}

const studentTabs: TabItem[] = [
  { title: "Dashboard", href: "/perfil", icon: LayoutDashboard },
  { title: "Tarefas", href: "/tarefas", icon: ClipboardList },
  { title: "Config", href: "/config", icon: Settings, isProfile: true },
  { title: "Agenda", href: "/agenda", icon: Calendar },
  { title: "Mensalidade", href: "/mensalidade", icon: CreditCard },
];

const adminTabs: TabItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Alunos", href: "/students", icon: Users },
  { title: "Config", href: "/config", icon: Settings, isProfile: true },
  { title: "Pagamentos", href: "/payments", icon: CreditCard },
  { title: "Turmas", href: "/classes", icon: GraduationCap },
];

const senseiTabs: TabItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Alunos", href: "/students", icon: Users },
  { title: "Config", href: "/config", icon: Settings, isProfile: true },
  { title: "Pagamentos", href: "/payments", icon: CreditCard },
  { title: "Turmas", href: "/classes", icon: GraduationCap },
];

export function StudentBottomNav() {
  const location = useLocation();
  const { profile, isStudent, canManageStudents, isSensei } = useAuth();
  const { getSignedUrl } = useSignedUrl();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Pick tabs based on role
  const tabs = isStudent && !canManageStudents
    ? studentTabs
    : isSensei && !canManageStudents
      ? senseiTabs
      : adminTabs;

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
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t-2 border-sidebar-border safe-area-inset-bottom"
      aria-label="Navegação principal"
    >
      <div className="flex items-end justify-around px-1 pt-2 pb-3">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.href;
          const Icon = tab.icon;

          // Profile/Config tab shows avatar - ELEVATED and BIGGER
          if (tab.isProfile) {
            return (
              <Link
                key={tab.href}
                to={tab.href}
                className="flex flex-col items-center -mt-7 relative px-2"
                aria-current={isActive ? "page" : undefined}
              >
                <div
                  className={cn(
                    "w-[3.5rem] h-[3.5rem] rounded-full flex items-center justify-center transition-all duration-300 overflow-hidden",
                    "shadow-lg border-[3px] border-sidebar",
                    isActive
                      ? "ring-2 ring-accent ring-offset-2 ring-offset-sidebar scale-110"
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
                      "text-base font-bold",
                      isActive ? "text-accent" : "text-sidebar-foreground/60"
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
                "flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all duration-200 min-w-[3.5rem]",
                isActive
                  ? "text-accent"
                  : "text-sidebar-foreground/50 hover:text-sidebar-foreground/80"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "h-6 w-6 transition-all duration-200",
                    isActive && "scale-110"
                  )}
                />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-accent animate-scale-in" />
                )}
              </div>
              <span className={cn(
                "text-xs font-medium transition-all duration-200",
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

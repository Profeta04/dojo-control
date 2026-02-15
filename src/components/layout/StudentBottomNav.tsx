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
  UserCog,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface TabItem {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
  isProfile?: boolean;
}

interface MoreItem {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
}

const studentTabs: TabItem[] = [
  { title: "Dashboard", href: "/perfil", icon: LayoutDashboard },
  { title: "Tarefas", href: "/tarefas", icon: ClipboardList },
  { title: "Config", href: "/config", icon: Settings, isProfile: true },
  { title: "Agenda", href: "/agenda", icon: Calendar },
  { title: "Mensalidade", href: "/mensalidade", icon: CreditCard },
];

// Admin/Dono: 4 main tabs + "Mais"
const adminTabs: TabItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Alunos", href: "/students", icon: Users },
  { title: "Config", href: "/config", icon: Settings, isProfile: true },
  { title: "Pagamentos", href: "/payments", icon: CreditCard },
];

const adminMoreItems: MoreItem[] = [
  { title: "Turmas", href: "/classes", icon: GraduationCap },
  { title: "Senseis", href: "/senseis", icon: UserCog },
  { title: "Graduações", href: "/graduations", icon: Trophy },
  { title: "Configurações", href: "/settings", icon: Settings },
];

// Sensei: 4 main tabs + "Mais"
const senseiTabs: TabItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Alunos", href: "/students", icon: Users },
  { title: "Config", href: "/config", icon: Settings, isProfile: true },
  { title: "Pagamentos", href: "/payments", icon: CreditCard },
];

const senseiMoreItems: MoreItem[] = [
  { title: "Turmas", href: "/classes", icon: GraduationCap },
  { title: "Graduações", href: "/graduations", icon: Trophy },
];

export function StudentBottomNav() {
  const location = useLocation();
  const { profile, isStudent, canManageStudents, isSensei, isDono, isAdmin } = useAuth();
  const { getSignedUrl } = useSignedUrl();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const isAdminRole = isDono || isAdmin;

  // Pick tabs and more items based on role
  const tabs = isStudent && !canManageStudents
    ? studentTabs
    : isAdminRole
      ? adminTabs
      : senseiTabs;

  const moreItems = isStudent && !canManageStudents
    ? [] // students have no "more" menu
    : isAdminRole
      ? adminMoreItems
      : senseiMoreItems;

  const hasMore = moreItems.length > 0;
  const isMoreActive = moreItems.some(item => location.pathname === item.href);

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
    <>
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

          {/* "Mais" button for admin/sensei */}
          {hasMore && (
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <button
                  className={cn(
                    "flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all duration-200 min-w-[3.5rem]",
                    isMoreActive
                      ? "text-accent"
                      : "text-sidebar-foreground/50 hover:text-sidebar-foreground/80"
                  )}
                >
                  <div className="relative">
                    <MoreHorizontal className={cn("h-6 w-6", isMoreActive && "scale-110")} />
                    {isMoreActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-accent animate-scale-in" />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs font-medium",
                    isMoreActive && "font-semibold"
                  )}>
                    Mais
                  </span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-sidebar border-sidebar-border rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle className="text-sidebar-foreground">Mais opções</SheetTitle>
                </SheetHeader>
                <div className="grid grid-cols-3 gap-3 py-4">
                  {moreItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setMoreOpen(false)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200",
                          isActive
                            ? "bg-accent/15 text-accent"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                        )}
                      >
                        <Icon className="h-7 w-7" />
                        <span className="text-xs font-medium">{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </nav>
    </>
  );
}

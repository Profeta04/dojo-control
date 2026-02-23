import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { AnimatePresence, motion } from "framer-motion";
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
  TrendingUp,
  ScanLine,
  ClipboardCheck,
  History,
  Landmark,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
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

const studentPage1: TabItem[] = [
  { title: "Dashboard", href: "/perfil", icon: LayoutDashboard },
  { title: "Tarefas", href: "/tarefas", icon: ClipboardList },
  { title: "Config", href: "/config", icon: Settings, isProfile: true },
  { title: "Agenda", href: "/agenda", icon: Calendar },
  { title: "Pagamentos", href: "/mensalidade", icon: CreditCard },
];

const studentPage2: TabItem[] = [
  { title: "Progresso", href: "/meu-progresso", icon: TrendingUp },
  { title: "Conquistas", href: "/conquistas", icon: Trophy },
  { title: "Ajuda", href: "/ajuda", icon: HelpCircle },
];

// Admin/Dono pages
const adminPage1: TabItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Alunos", href: "/students", icon: Users },
  { title: "Config", href: "/config", icon: Settings, isProfile: true },
  { title: "Pagamentos", href: "/payments", icon: CreditCard },
];

const adminPage2: TabItem[] = [
  { title: "Progresso", href: "/progresso", icon: TrendingUp },
  { title: "Turmas", href: "/classes", icon: GraduationCap },
  { title: "Presenças", href: "/attendance", icon: ClipboardCheck },
  { title: "Graduações", href: "/graduations", icon: Trophy },
  { title: "Ajuda", href: "/ajuda", icon: HelpCircle },
];

const adminPage2WithSenseis: TabItem[] = [
  ...adminPage2,
  { title: "Senseis", href: "/senseis", icon: UserCog },
];

// Sensei pages (same as admin but no Senseis)
const senseiPage1 = adminPage1;
const senseiPage2 = adminPage2;

export function StudentBottomNav() {
  const location = useLocation();
  const { profile, isStudent, canManageStudents, isSensei, isAdmin } = useAuth();
  const { getSignedUrl } = useSignedUrl();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const isAdminRole = isAdmin;
  const isStaff = canManageStudents;

  // Determine which pages to use
  const isStudentOnly = isStudent && !canManageStudents;
  const pages: TabItem[][] = isStudentOnly
    ? [studentPage1, studentPage2]
    : isAdminRole
      ? [adminPage1, adminPage2WithSenseis]
      : [senseiPage1, senseiPage2];

  const hasPagination = pages.length > 1;
  const currentTabs = pages[page] || pages[0];

  // Auto-switch to correct page based on current route
  useEffect(() => {
    if (!hasPagination) return;
    const isOnPage2 = pages[1]?.some(t => location.pathname === t.href);
    if (isOnPage2 && page !== 1) setPage(1);
    else if (!isOnPage2 && page !== 0) {
      const isOnPage1 = pages[0]?.some(t => location.pathname === t.href);
      if (isOnPage1) setPage(0);
    }
  }, [location.pathname]);

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

  const renderTab = (tab: TabItem, index: number) => {
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
        </div>
        <span className={cn(
          "text-xs font-medium transition-all duration-200",
          isActive && "font-semibold"
        )}>
          {tab.title}
        </span>
      </Link>
    );
  };

  return (
    <nav
      id="student-bottom-nav"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar border-t-2 border-sidebar-border safe-area-inset-bottom"
      aria-label="Navegação principal"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          initial={{ opacity: 0, x: page === 1 ? 40 : -40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: page === 1 ? -40 : 40 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="flex items-end justify-around w-full px-1 pt-2 pb-3"
        >
          {/* Page 2: show back arrow first */}
          {hasPagination && page === 1 && (
            <button
              onClick={() => setPage(0)}
              className="flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all duration-200 min-w-[3rem] text-sidebar-foreground/50 hover:text-sidebar-foreground/80 active:scale-95"
              aria-label="Voltar"
            >
              <ChevronLeft className="h-6 w-6" />
              <span className="text-[0.6rem] font-medium">Voltar</span>
            </button>
          )}

          {currentTabs.map((tab, i) => renderTab(tab, i))}

          {/* Page 1: show forward arrow last */}
          {hasPagination && page === 0 && (
            <button
              onClick={() => setPage(1)}
              className="flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all duration-200 min-w-[3rem] text-sidebar-foreground/50 hover:text-sidebar-foreground/80 active:scale-95"
              aria-label="Mais opções"
            >
              <ChevronRight className="h-6 w-6" />
              <span className="text-[0.6rem] font-medium">Mais</span>
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </nav>
  );
}

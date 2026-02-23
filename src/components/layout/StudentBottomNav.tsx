import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { BeltBadge, BELT_HEX_COLORS } from "@/components/shared/BeltBadge";
import { StudentBelt } from "@/hooks/useStudentBelts";
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
import { useStudentBelts } from "@/hooks/useStudentBelts";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

interface TabItem {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
  isProfile?: boolean;
}

// Student pages — matching sidebar: Principal then Pagamentos
const studentPage1: TabItem[] = [
  { title: "Início", href: "/perfil", icon: LayoutDashboard },
  { title: "Tarefas", href: "/tarefas", icon: ClipboardList },
  { title: "Perfil", href: "/config", icon: Settings, isProfile: true },
  { title: "Pagamentos", href: "/mensalidade", icon: CreditCard },
];

const studentPage2: TabItem[] = [
  { title: "Agenda", href: "/agenda", icon: Calendar },
  { title: "Progresso", href: "/meu-progresso", icon: TrendingUp },
  { title: "Conquistas", href: "/conquistas", icon: Trophy },
  { title: "Ajuda", href: "/ajuda", icon: HelpCircle },
];

// Staff pages — matching sidebar sections (Principal / Financeiro / Configurações)
const staffPage1: TabItem[] = [
  { title: "Início", href: "/dashboard", icon: LayoutDashboard },
  { title: "Alunos", href: "/students", icon: Users },
  { title: "Perfil", href: "/config", icon: Settings, isProfile: true },
  { title: "Progresso", href: "/progresso", icon: TrendingUp },
];

const staffPage2: TabItem[] = [
  { title: "Turmas", href: "/classes", icon: GraduationCap },
  { title: "Presenças", href: "/attendance", icon: ClipboardCheck },
  { title: "Pagar", href: "/payments", icon: CreditCard },
  { title: "Histórico", href: "/payment-history", icon: History },
];

const staffPage3: TabItem[] = [
  { title: "Graduação", href: "/graduations", icon: Trophy },
  { title: "Planos", href: "/planos", icon: CreditCard },
  { title: "Dojo", href: "/settings", icon: Landmark },
  { title: "Ajuda", href: "/ajuda", icon: HelpCircle },
];

const staffPage3WithAdmin: TabItem[] = [
  { title: "Graduação", href: "/graduations", icon: Trophy },
  { title: "Senseis", href: "/senseis", icon: UserCog },
  { title: "Planos", href: "/planos", icon: CreditCard },
  { title: "Dojo", href: "/settings", icon: Landmark },
  { title: "Ajuda", href: "/ajuda", icon: HelpCircle },
];

/** Split belt badge: left half = first belt color, right half = second belt color, same size as sm BeltBadge */
function SplitBeltBadge({ belts }: { belts: StudentBelt[] }) {
  const left = BELT_HEX_COLORS[belts[0]?.belt_grade] || "#CCCCCC";
  const right = BELT_HEX_COLORS[belts[1]?.belt_grade] || "#CCCCCC";
  const isLeftWhite = belts[0]?.belt_grade === "branca";
  const isRightWhite = belts[1]?.belt_grade === "branca";

  return (
    <div
      className={cn(
        "h-3 w-12 rounded-sm overflow-hidden flex",
        (isLeftWhite || isRightWhite) && "border border-foreground/40"
      )}
      title={`${belts[0]?.martial_art} / ${belts[1]?.martial_art}`}
    >
      <div className="w-1/2 h-full" style={{ backgroundColor: left }} />
      <div className="w-1/2 h-full" style={{ backgroundColor: right }} />
    </div>
  );
}

  export function StudentBottomNav() {
  const { profile, isStudent, canManageStudents, isSensei, isAdmin } = useAuth();
  const { getSignedUrl } = useSignedUrl();
  const { data: studentBelts } = useStudentBelts(profile?.user_id);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const isAdminRole = isAdmin;
  const isStaff = canManageStudents;

  // Determine which pages to use
  const isStudentOnly = isStudent && !canManageStudents;
  const pages: TabItem[][] = isStudentOnly
    ? [studentPage1, studentPage2]
    : isAdminRole
      ? [staffPage1, staffPage2, staffPage3WithAdmin]
      : [staffPage1, staffPage2, staffPage3];

  const hasPagination = pages.length > 1;
  const currentTabs = pages[page] || pages[0];

  // Auto-switch to correct page based on current route
  useEffect(() => {
    if (!hasPagination) return;
    for (let i = 0; i < pages.length; i++) {
      if (pages[i]?.some(t => location.pathname === t.href)) {
        if (page !== i) setPage(i);
        return;
      }
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
          className="flex flex-col items-center -mt-5 relative px-1 flex-1 min-w-0"
          aria-current={isActive ? "page" : undefined}
        >
          <div
            className={cn(
              "w-[3rem] h-[3rem] rounded-full flex items-center justify-center transition-all duration-300 overflow-hidden",
              "shadow-lg border-2 border-sidebar",
              isActive
                ? "ring-2 ring-accent ring-offset-1 ring-offset-sidebar scale-110"
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
          {studentBelts && studentBelts.length > 1 ? (
            <div className="mt-0.5 animate-scale-in">
              <SplitBeltBadge belts={studentBelts} />
            </div>
          ) : studentBelts && studentBelts.length === 1 ? (
            <div className="mt-0.5 animate-scale-in">
              <BeltBadge grade={studentBelts[0].belt_grade as any} size="sm" />
            </div>
          ) : profile?.belt_grade ? (
            <div className="mt-0.5 animate-scale-in">
              <BeltBadge grade={profile.belt_grade as any} size="sm" />
            </div>
          ) : null}
        </Link>
      );
    }

    return (
      <Link
        key={tab.href}
        to={tab.href}
        className={cn(
          "flex flex-col items-center gap-0.5 py-1 px-1 rounded-xl transition-all duration-200 min-w-0 flex-1",
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
          "text-[0.65rem] leading-tight font-medium transition-all duration-200 truncate max-w-full text-center",
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
          {/* Back arrow if not on first page */}
          {hasPagination && page > 0 && (
            <button
              onClick={() => setPage(page - 1)}
              className="flex flex-col items-center gap-0.5 py-1 px-1 rounded-xl transition-all duration-200 min-w-0 flex-1 text-sidebar-foreground/50 hover:text-sidebar-foreground/80 active:scale-95"
              aria-label="Voltar"
            >
              <ChevronLeft className="h-6 w-6" />
              <span className="text-[0.65rem] leading-tight font-medium">Voltar</span>
            </button>
          )}

          {currentTabs.map((tab, i) => renderTab(tab, i))}

          {/* Forward arrow if not on last page */}
          {hasPagination && page < pages.length - 1 && (
            <button
              onClick={() => setPage(page + 1)}
              className="flex flex-col items-center gap-0.5 py-1 px-1 rounded-xl transition-all duration-200 min-w-0 flex-1 text-sidebar-foreground/50 hover:text-sidebar-foreground/80 active:scale-95"
              aria-label="Mais opções"
            >
              <ChevronRight className="h-6 w-6" />
              <span className="text-[0.65rem] leading-tight font-medium">Mais</span>
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </nav>
  );
}

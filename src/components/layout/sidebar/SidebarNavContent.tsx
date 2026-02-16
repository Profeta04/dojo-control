import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CreditCard,
  Trophy,
  UserCog,
  Settings,
  Building,
  CalendarDays,
  ClipboardList,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDojoSettings } from "@/hooks/useDojoSettings";
import { useDojoContext } from "@/hooks/useDojoContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarUserFooter } from "./SidebarUserFooter";
import { SidebarDarkModeToggle } from "./SidebarDarkModeToggle";

interface NavItem {
  title: string;
  href: string;
  icon: ReactNode;
  adminOnly?: boolean;
  ownerOnly?: boolean;
  studentOnly?: boolean;
}

// Main navigation items (no config here — it goes in footer)
const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-[1.35rem] w-[1.35rem]" />, adminOnly: true },
  { title: "Dashboard", href: "/perfil", icon: <LayoutDashboard className="h-[1.35rem] w-[1.35rem]" />, studentOnly: true },
  { title: "Tarefas", href: "/tarefas", icon: <ClipboardList className="h-[1.35rem] w-[1.35rem]" />, studentOnly: true },
  { title: "Alunos", href: "/students", icon: <Users className="h-[1.35rem] w-[1.35rem]" />, adminOnly: true },
  { title: "Progresso", href: "/progresso", icon: <TrendingUp className="h-[1.35rem] w-[1.35rem]" />, adminOnly: true },
  { title: "Senseis", href: "/senseis", icon: <UserCog className="h-[1.35rem] w-[1.35rem]" />, ownerOnly: true },
  { title: "Turmas", href: "/classes", icon: <GraduationCap className="h-[1.35rem] w-[1.35rem]" />, adminOnly: true },
  { title: "Agenda", href: "/agenda", icon: <CalendarDays className="h-[1.35rem] w-[1.35rem]" />, studentOnly: true },
  { title: "Pagamentos", href: "/payments", icon: <CreditCard className="h-[1.35rem] w-[1.35rem]" />, adminOnly: true },
  { title: "Mensalidade", href: "/mensalidade", icon: <CreditCard className="h-[1.35rem] w-[1.35rem]" />, studentOnly: true },
  { title: "Graduações", href: "/graduations", icon: <Trophy className="h-[1.35rem] w-[1.35rem]" />, adminOnly: true },
  { title: "Configurações", href: "/settings", icon: <Settings className="h-[1.35rem] w-[1.35rem]" />, ownerOnly: true },
];

interface SidebarNavContentProps {
  logoUrl: string | null;
  onCloseMobile?: () => void;
}

export function SidebarNavContent({ logoUrl, onCloseMobile }: SidebarNavContentProps) {
  const location = useLocation();
  const { canManageStudents, isStudent, isDono, isAdmin, isSensei } = useAuth();
  const { settings } = useDojoSettings();
  const { currentDojoId, setCurrentDojoId, userDojos } = useDojoContext();
  const currentDojo = userDojos.find(d => d.id === currentDojoId) || userDojos[0];
  const showDojoSelector = userDojos.length > 1 && canManageStudents;

  const filteredNavItems = navItems.filter((item) => {
    if (!item.adminOnly && !item.ownerOnly && !item.studentOnly) return true;
    if (item.ownerOnly && (isDono || isAdmin)) return true;
    if (item.adminOnly && canManageStudents) return true;
    if (item.studentOnly && isStudent && !canManageStudents) return true;
    return false;
  });

  // Group items into sections
  const mainItems = filteredNavItems.filter(i => 
    ["/dashboard", "/perfil", "/tarefas", "/students", "/progresso", "/senseis", "/classes", "/agenda"].includes(i.href)
  );
  const financeItems = filteredNavItems.filter(i => 
    ["/payments", "/mensalidade", "/graduations"].includes(i.href)
  );
  const adminItems = filteredNavItems.filter(i => 
    ["/settings"].includes(i.href)
  );

  const renderNavItem = (item: NavItem, index: number) => {
    const isActive = location.pathname === item.href;
    return (
      <Link
        key={item.href}
        to={item.href}
        onClick={onCloseMobile}
        className={cn(
          "group relative flex items-center gap-3.5 px-3.5 py-3 rounded-lg text-sm font-medium",
          "transition-all duration-200 ease-out",
          "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar",
          "active:scale-[0.98]",
          isActive
            ? "bg-sidebar-primary/15 text-sidebar-primary"
            : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/40"
        )}
        style={{
          animationDelay: `${index * 30}ms`,
          animation: "fade-in 0.3s ease-out both",
        }}
        aria-current={isActive ? "page" : undefined}
      >
        {/* Animated left bar indicator */}
        <span className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-sidebar-primary transition-all duration-300",
          isActive ? "h-5 opacity-100" : "h-0 opacity-0"
        )} />
        <span className={cn(
          "flex-shrink-0 transition-all duration-200",
          isActive
            ? "text-sidebar-primary scale-110"
            : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80 group-hover:scale-105"
        )}>
          {item.icon}
        </span>
        <span className="truncate">{item.title}</span>
        {isActive && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary animate-scale-in" />
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Logo & Dojo Header */}
      <div className="p-4 lg:p-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-sm ring-1 ring-sidebar-border/50">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`Logo ${currentDojo?.name || settings.dojo_name}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-sidebar-primary/10 flex items-center justify-center">
                <Building className="h-6 w-6 text-sidebar-primary" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-base text-sidebar-foreground truncate leading-tight">
              {currentDojo?.name || settings.dojo_name}
            </h1>
            <p className="text-xs text-sidebar-foreground/50 truncate mt-0.5">
              {currentDojo?.description || "Sistema de Gestão"}
            </p>
          </div>
        </div>

        {showDojoSelector && (
          <div className="mt-3">
            <Select
              value={currentDojoId || "all"}
              onValueChange={(value) => setCurrentDojoId(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-full h-8 text-xs bg-sidebar-accent/30 border-sidebar-border text-sidebar-foreground">
                <Building className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                <SelectValue placeholder="Selecione o dojo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os dojos</SelectItem>
                {userDojos.map((dojo) => (
                  <SelectItem key={dojo.id} value={dojo.id}>
                    {dojo.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Separator className="bg-sidebar-border/40 mx-4" />

      {/* Navigation Links - Sections */}
      <ScrollArea className="flex-1 px-3.5 py-3.5">
        <nav aria-label="Menu principal">
          {/* Section: Principal */}
          {mainItems.length > 0 && (
            <div className="mb-4">
              <p className="px-3.5 mb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                Principal
              </p>
              <div className="space-y-1">
                {mainItems.map((item, i) => renderNavItem(item, i))}
              </div>
            </div>
          )}

          {/* Section: Financeiro / Graduações */}
          {financeItems.length > 0 && (
            <div className="mb-4">
              <p className="px-3.5 mb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {canManageStudents ? "Financeiro" : "Pagamentos"}
              </p>
              <div className="space-y-1">
                {financeItems.map((item, i) => renderNavItem(item, mainItems.length + i))}
              </div>
            </div>
          )}

          {/* Section: Administração */}
          {adminItems.length > 0 && (
            <div>
              <p className="px-3.5 mb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                Administração
              </p>
              <div className="space-y-1">
                {adminItems.map((item, i) => renderNavItem(item, mainItems.length + financeItems.length + i))}
              </div>
            </div>
          )}
        </nav>
      </ScrollArea>

      {/* Dark Mode Toggle */}
      <SidebarDarkModeToggle />

      <Separator className="bg-sidebar-border/40 mx-4" />

      {/* User Footer with config gear icon */}
      <SidebarUserFooter onCloseMobile={onCloseMobile} />
    </>
  );
}

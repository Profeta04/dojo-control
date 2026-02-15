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

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-5 w-5" />, adminOnly: true },
  { title: "Dashboard", href: "/perfil", icon: <LayoutDashboard className="h-5 w-5" />, studentOnly: true },
  { title: "Tarefas", href: "/tarefas", icon: <ClipboardList className="h-5 w-5" />, studentOnly: true },
  { title: "Alunos", href: "/students", icon: <Users className="h-5 w-5" />, adminOnly: true },
  { title: "Senseis", href: "/senseis", icon: <UserCog className="h-5 w-5" />, ownerOnly: true },
  { title: "Turmas", href: "/classes", icon: <GraduationCap className="h-5 w-5" />, adminOnly: true },
  { title: "Agenda", href: "/agenda", icon: <CalendarDays className="h-5 w-5" />, studentOnly: true },
  { title: "Pagamentos", href: "/payments", icon: <CreditCard className="h-5 w-5" />, adminOnly: true },
  { title: "Mensalidade", href: "/mensalidade", icon: <CreditCard className="h-5 w-5" />, studentOnly: true },
  { title: "Graduações", href: "/graduations", icon: <Trophy className="h-5 w-5" />, adminOnly: true },
  { title: "Configurações", href: "/settings", icon: <Settings className="h-5 w-5" />, ownerOnly: true },
  { title: "Configurações", href: "/config", icon: <Settings className="h-5 w-5" />, studentOnly: true },
];

interface SidebarNavContentProps {
  logoUrl: string | null;
  onCloseMobile?: () => void;
}

export function SidebarNavContent({ logoUrl, onCloseMobile }: SidebarNavContentProps) {
  const location = useLocation();
  const { canManageStudents, isStudent, isDono, isAdmin, isSensei } = useAuth();
  const { settings } = useDojoSettings();
  const { currentDojoId, setCurrentDojoId, userDojos, isLoadingDojos } = useDojoContext();
  const currentDojo = userDojos.find(d => d.id === currentDojoId) || userDojos[0];
  const showDojoSelector = userDojos.length > 1 && canManageStudents;

  const filteredNavItems = navItems.filter((item) => {
    if (!item.adminOnly && !item.ownerOnly && !item.studentOnly) return true;
    if (item.ownerOnly && (isDono || isAdmin)) return true;
    if (item.adminOnly && canManageStudents) return true;
    if (item.studentOnly && isStudent && !canManageStudents) return true;
    return false;
  });

  return (
    <>
      {/* Logo & Dojo Header */}
      <div className="p-4 lg:p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-sm ring-1 ring-sidebar-border/50">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={`Logo ${currentDojo?.name || settings.dojo_name}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-sidebar-primary/10 flex items-center justify-center">
                <Building className="h-5 w-5 text-sidebar-primary" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-sm text-sidebar-foreground truncate leading-tight">
              {currentDojo?.name || settings.dojo_name}
            </h1>
            <p className="text-[11px] text-sidebar-foreground/50 truncate mt-0.5">
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

      <Separator className="bg-sidebar-border/60 mx-3" />

      {/* Navigation Links */}
      <ScrollArea className="flex-1 px-3 py-3">
        <nav className="space-y-0.5" aria-label="Menu principal">
          {filteredNavItems.map((item, index) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onCloseMobile}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium",
                  "transition-all duration-200 ease-out",
                  "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar",
                  "active:scale-[0.98]",
                  isActive
                    ? "bg-sidebar-primary/15 text-sidebar-primary shadow-sm"
                    : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
                style={{ 
                  animationDelay: `${index * 30}ms`,
                  animation: "fade-in 0.3s ease-out both",
                }}
                aria-current={isActive ? "page" : undefined}
              >
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
          })}
        </nav>
      </ScrollArea>

      {/* Dark Mode Toggle */}
      <SidebarDarkModeToggle />

      <Separator className="bg-sidebar-border/60 mx-3" />

      {/* User Footer */}
      <SidebarUserFooter />
    </>
  );
}

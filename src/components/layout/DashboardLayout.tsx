import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDojoSettings } from "@/hooks/useDojoSettings";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  Trophy,
  LogOut,
  Menu,
  X,
  UserCog,
  Settings,
} from "lucide-react";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface NavItem {
  title: string;
  href: string;
  icon: ReactNode;
  roles?: ("admin" | "sensei" | "student")[];
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  { title: "Alunos", href: "/students", icon: <Users className="h-5 w-5" />, roles: ["admin", "sensei"] },
  { title: "Senseis", href: "/senseis", icon: <UserCog className="h-5 w-5" />, roles: ["admin"] },
  { title: "Turmas", href: "/classes", icon: <GraduationCap className="h-5 w-5" /> },
  { title: "Agenda", href: "/schedule", icon: <CalendarDays className="h-5 w-5" /> },
  { title: "Presenças", href: "/attendance", icon: <ClipboardCheck className="h-5 w-5" />, roles: ["admin", "sensei"] },
  { title: "Pagamentos", href: "/payments", icon: <CreditCard className="h-5 w-5" />, roles: ["admin", "sensei"] },
  { title: "Mensalidade", href: "/mensalidade", icon: <CreditCard className="h-5 w-5" />, roles: ["student"] },
  { title: "Graduações", href: "/graduations", icon: <Trophy className="h-5 w-5" /> },
  { title: "Configurações", href: "/settings", icon: <Settings className="h-5 w-5" />, roles: ["admin"] },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, roles, signOut, isAdmin, isSensei } = useAuth();
  const { settings } = useDojoSettings();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.some((role) => roles.includes(role));
  });

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent">
            <span className="text-xl">🥋</span>
          </div>
          <div>
            <h1 className="font-bold text-lg text-sidebar-foreground">{settings.dojo_name}</h1>
            <p className="text-xs text-sidebar-foreground/60">Sistema de Gestão</p>
          </div>
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {filteredNavItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                location.pathname === item.href
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              {item.icon}
              {item.title}
            </Link>
          ))}
        </nav>
      </ScrollArea>

      <Separator className="bg-sidebar-border" />

      {/* User Info */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-sidebar-foreground font-medium">
                {profile?.name?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.name || "Usuário"}
            </p>
            <div className="flex items-center gap-2">
              {profile?.belt_grade && (
                <BeltBadge grade={profile.belt_grade} size="sm" />
              )}
              <span className="text-xs text-sidebar-foreground/60">
                {isAdmin ? "Admin" : isSensei ? "Sensei" : "Aluno"}
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent">
              <span className="text-lg">🥋</span>
            </div>
            <span className="font-bold text-sidebar-foreground">{settings.dojo_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NavContent />
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 lg:pt-0 min-h-screen">
        {/* Desktop notification bell */}
        <div className="hidden lg:flex justify-end p-4 pb-0">
          <NotificationBell />
        </div>
        <div className="p-4 lg:px-8 lg:pt-2 lg:pb-8">{children}</div>
      </main>
    </div>
  );
}

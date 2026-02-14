import { ReactNode, useState, useEffect } from "react";
import dojoLogo from "@/assets/dojo-manager-logo.png";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDojoSettings } from "@/hooks/useDojoSettings";
import { useDojoContext } from "@/hooks/useDojoContext";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CreditCard,
  Trophy,
  LogOut,
  Menu,
  X,
  UserCog,
  Settings,
  Building,
  Sun,
  Moon,
} from "lucide-react";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NavItem {
  title: string;
  href: string;
  icon: ReactNode;
  adminOnly?: boolean; // Shows for dono, admin, sensei
  ownerOnly?: boolean; // Shows only for dono and admin (not sensei)
  studentOnly?: boolean; // Shows only for students
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  { title: "Alunos", href: "/students", icon: <Users className="h-5 w-5" />, adminOnly: true },
  { title: "Senseis", href: "/senseis", icon: <UserCog className="h-5 w-5" />, ownerOnly: true },
  { title: "Turmas", href: "/classes", icon: <GraduationCap className="h-5 w-5" />, adminOnly: true },
  { title: "Agenda", href: "/agenda", icon: <GraduationCap className="h-5 w-5" />, studentOnly: true },
  { title: "Pagamentos", href: "/payments", icon: <CreditCard className="h-5 w-5" />, adminOnly: true },
  { title: "Mensalidade", href: "/mensalidade", icon: <CreditCard className="h-5 w-5" />, studentOnly: true },
  { title: "Graduações", href: "/graduations", icon: <Trophy className="h-5 w-5" />, adminOnly: true },
  { title: "Configurações", href: "/settings", icon: <Settings className="h-5 w-5" />, ownerOnly: true },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut, canManageStudents, isStudent, isDono, isAdmin, isSensei } = useAuth();
  const { settings } = useDojoSettings();
  const { currentDojoId, setCurrentDojoId, userDojos, isLoadingDojos } = useDojoContext();
  const { getSignedUrl } = useSignedUrl();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  const currentDojo = userDojos.find(d => d.id === currentDojoId) || userDojos[0];
  
  // Dark mode from react-query (single source of truth, stays in sync)
  const { data: isDarkMode = false } = useQuery({
    queryKey: ["user-dark-mode", profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return false;
      const { data, error } = await supabase
        .from("profiles")
        .select("dark_mode")
        .eq("user_id", profile.user_id)
        .maybeSingle();
      if (error || !data) return false;
      return data.dark_mode ?? false;
    },
    enabled: !!profile?.user_id,
    staleTime: 10 * 60 * 1000,
  });
  
  const toggleDarkMode = async () => {
    if (!profile) return;
    const newValue = !isDarkMode;
    
    // Optimistic update
    queryClient.setQueryData(["user-dark-mode", profile.user_id], newValue);
    
    const { error } = await supabase
      .from("profiles")
      .update({ dark_mode: newValue })
      .eq("user_id", profile.user_id);
    
    if (error) {
      console.error("[toggleDarkMode] Failed:", error.message);
      // Revert optimistic update
      queryClient.setQueryData(["user-dark-mode", profile.user_id], isDarkMode);
      return;
    }
    
    queryClient.invalidateQueries({ queryKey: ["user-dark-mode"] });
    queryClient.invalidateQueries({ queryKey: ["dojo-theme"] });
  };
  
  const showDojoSelector = userDojos.length > 1 && canManageStudents;
  
  useEffect(() => {
    const loadLogoUrl = async () => {
      if (currentDojo?.logo_url) {
        // Check if it's a storage path or a direct URL
        if (currentDojo.logo_url.startsWith('http')) {
          setLogoUrl(currentDojo.logo_url);
        } else {
          // Assume it's a storage path in a public bucket
          const signedUrl = await getSignedUrl('dojo-logos', currentDojo.logo_url);
          setLogoUrl(signedUrl);
        }
      } else {
        setLogoUrl(null);
      }
    };
    
    loadLogoUrl();
  }, [currentDojo?.logo_url, getSignedUrl]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const filteredNavItems = navItems.filter((item) => {
    // Dashboard is always visible
    if (!item.adminOnly && !item.ownerOnly && !item.studentOnly) return true;
    // Owner-only items for dono and admin only (not sensei)
    if (item.ownerOnly && (isDono || isAdmin)) return true;
    // Admin-only items for dono, admin, sensei
    if (item.adminOnly && canManageStudents) return true;
    // Student-only items
    if (item.studentOnly && isStudent && !canManageStudents) return true;
    return false;
  });

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="p-4 lg:p-6 safe-area-inset-top">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={`Logo ${settings.dojo_name}`}
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <img src={dojoLogo} alt="Dojo Manager" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
          )}
          <div className="min-w-0">
            <h1 className="font-bold text-base lg:text-lg text-sidebar-foreground truncate">{settings.dojo_name}</h1>
            <p className="text-xs text-sidebar-foreground/60">Sistema de Gestão</p>
          </div>
        </div>
        {/* Dojo Selector in sidebar - works on all screen sizes */}
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

      <Separator className="bg-sidebar-border" aria-hidden="true" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 lg:px-3 py-3 lg:py-4">
        <nav className="space-y-0.5 lg:space-y-1" aria-label="Menu principal">
          {filteredNavItems.map((item, index) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-3 lg:py-2.5 rounded-lg text-sm font-medium touch-target no-select",
                "transition-all duration-200 ease-out",
                "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                "active:scale-[0.97]",
                location.pathname === item.href
                  ? "bg-sidebar-primary/20 text-sidebar-primary shadow-sm border-l-2 border-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:text-sidebar-primary hover:bg-sidebar-primary/10 hover:translate-x-1"
              )}
              style={{ animationDelay: `${index * 40}ms` }}
              aria-current={location.pathname === item.href ? "page" : undefined}
            >
              <span aria-hidden="true" className={cn(
                "flex-shrink-0 transition-transform duration-200",
                location.pathname === item.href ? "scale-110" : "group-hover:scale-110"
              )}>{item.icon}</span>
              <span className="truncate">{item.title}</span>
              {location.pathname === item.href && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary animate-scale-in" />
              )}
            </Link>
          ))}
        </nav>
      </ScrollArea>

      {/* Dark Mode Toggle */}
      {profile && (
        <div className="px-3 lg:px-4 py-2">
          <button
            onClick={toggleDarkMode}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium",
              "transition-all duration-200 ease-out",
              "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 hover:translate-x-1",
              "active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            )}
            aria-label={isDarkMode ? "Ativar modo claro" : "Ativar modo escuro"}
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5 flex-shrink-0 transition-transform duration-300 hover:rotate-45" />
            ) : (
              <Moon className="h-5 w-5 flex-shrink-0 transition-transform duration-300 hover:-rotate-12" />
            )}
            <span>{isDarkMode ? "Modo Claro" : "Modo Escuro"}</span>
          </button>
        </div>
      )}

      <Separator className="bg-sidebar-border" aria-hidden="true" />

      {/* User Info */}
      <div className="p-3 lg:p-4 safe-area-inset-bottom" role="region" aria-label="Informações do usuário">
        <div className="flex items-center gap-3 mb-3 lg:mb-4">
          <div className="flex-shrink-0">
            <div 
              className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="text-sidebar-accent-foreground font-medium">
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
                <BeltBadge grade={profile.belt_grade as any} size="sm" />
              )}
              <span className="text-xs text-sidebar-foreground/60">
                {isDono ? "Dono" : isAdmin ? "Admin" : isSensei ? "Sensei" : "Aluno"}
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start h-11 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 active:scale-[0.97] transition-all duration-200 hover:translate-x-1 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          onClick={handleSignOut}
          aria-label="Sair da conta"
        >
          <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
          Sair
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to main content link */}
      <a 
        href="#main-content" 
        className="skip-to-main"
        tabIndex={0}
      >
        Pular para o conteúdo principal
      </a>

      {/* Mobile Header */}
      <header 
        className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border safe-area-inset-top"
        role="banner"
      >
        <div className="h-14 px-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={`Logo ${settings.dojo_name}`}
                className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <img src={dojoLogo} alt="Dojo Manager" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
            )}
            <span className="font-semibold text-sm text-sidebar-foreground truncate">
              {settings.dojo_name}
            </span>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground hover:bg-sidebar-accent active:bg-sidebar-accent h-10 w-10 touch-target focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-expanded={sidebarOpen}
              aria-controls="mobile-sidebar"
              aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}
            >
              {sidebarOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Desktop Sidebar - Always visible on lg+ */}
      <aside
        className="hidden lg:flex fixed top-0 left-0 z-40 h-full w-64 bg-sidebar border-r border-sidebar-border flex-col"
        role="navigation"
        aria-label="Menu lateral desktop"
      >
        <NavContent />
      </aside>

      {/* Mobile Sidebar - Slide in/out */}
      <aside
        id="mobile-sidebar"
        className={cn(
          "lg:hidden fixed top-0 left-0 z-50 h-full w-[280px] bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-300 ease-out",
          "will-change-transform",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        role="navigation"
        aria-label="Menu lateral mobile"
      >
        <NavContent />
      </aside>

      {/* Main Content */}
      <main id="main-content" className="lg:pl-64 min-h-screen" tabIndex={-1}>
        {/* Mobile spacer for fixed header */}
        <div className="h-14 lg:hidden safe-area-inset-top" />
        
        {/* Desktop header area */}
        <div className="hidden lg:flex items-center justify-between h-14 px-6 border-b border-border/50" role="banner">
          {/* Dojo Selector */}
          {showDojoSelector && !isLoadingDojos && (
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <Select
                value={currentDojoId || "all"}
                onValueChange={(value) => setCurrentDojoId(value === "all" ? null : value)}
              >
                <SelectTrigger className="w-[160px] h-8 text-sm">
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
          {!showDojoSelector && <div />}
          <NotificationBell />
        </div>
        <div className="p-3 sm:p-4 lg:p-6 safe-area-inset-bottom">{children}</div>
      </main>
    </div>
  );
}

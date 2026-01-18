import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDojoSettings } from "@/hooks/useDojoSettings";
import { useDojoContext } from "@/hooks/useDojoContext";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
} from "lucide-react";
import { BeltBadge } from "@/components/shared/BeltBadge";
import { NotificationBell } from "@/components/notifications/NotificationBell";
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
  roles?: ("admin" | "sensei" | "student")[];
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
  { title: "Alunos", href: "/students", icon: <Users className="h-5 w-5" />, roles: ["admin", "sensei"] },
  { title: "Senseis", href: "/senseis", icon: <UserCog className="h-5 w-5" />, roles: ["admin"] },
  { title: "Turmas", href: "/classes", icon: <GraduationCap className="h-5 w-5" /> },
  { title: "Pagamentos", href: "/payments", icon: <CreditCard className="h-5 w-5" />, roles: ["admin", "sensei"] },
  { title: "Mensalidade", href: "/mensalidade", icon: <CreditCard className="h-5 w-5" />, roles: ["student"] },
  { title: "Graduações", href: "/graduations", icon: <Trophy className="h-5 w-5" /> },
  { title: "Configurações", href: "/settings", icon: <Settings className="h-5 w-5" />, roles: ["admin", "sensei"] },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, roles, signOut, isAdmin, isSensei } = useAuth();
  const { settings } = useDojoSettings();
  const { currentDojoId, setCurrentDojoId, userDojos, isLoadingDojos } = useDojoContext();
  const { getSignedUrl } = useSignedUrl();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  
  const showDojoSelector = userDojos.length > 1 && (isAdmin || isSensei);
  
  // Get current dojo logo
  const currentDojo = userDojos.find(d => d.id === currentDojoId) || userDojos[0];
  
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
    if (!item.roles) return true;
    return item.roles.some((role) => roles.includes(role));
  });

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={`Logo ${settings.dojo_name}`}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-foreground/20" aria-hidden="true">
              <span className="text-xl">🥋</span>
            </div>
          )}
          <div>
            <h1 className="font-bold text-lg text-primary-foreground text-outlined">{settings.dojo_name}</h1>
            <p className="text-xs text-primary-foreground/60">Sistema de Gestão</p>
          </div>
        </div>
      </div>

      <Separator className="bg-primary-foreground/20" aria-hidden="true" />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1" aria-label="Menu principal">
          {filteredNavItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-primary text-outlined",
                location.pathname === item.href
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
              )}
              aria-current={location.pathname === item.href ? "page" : undefined}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.title}
            </Link>
          ))}
        </nav>
      </ScrollArea>

      <Separator className="bg-primary-foreground/20" aria-hidden="true" />

      {/* User Info */}
      <div className="p-4" role="region" aria-label="Informações do usuário">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0">
            <div 
              className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="text-primary-foreground font-medium text-outlined">
                {profile?.name?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary-foreground truncate text-outlined">
              {profile?.name || "Usuário"}
            </p>
            <div className="flex items-center gap-2">
              {profile?.belt_grade && (
                <BeltBadge grade={profile.belt_grade} size="sm" />
              )}
              <span className="text-xs text-primary-foreground/60 text-outlined">
                {isAdmin ? "Admin" : isSensei ? "Sensei" : "Aluno"}
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 focus-visible:ring-2 focus-visible:ring-primary-foreground text-outlined"
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
        className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-primary border-b border-primary/20 h-14 px-4 flex items-center"
        role="banner"
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={`Logo ${settings.dojo_name}`}
                className="w-8 h-8 rounded-lg object-cover"
              />
            ) : (
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-foreground/20" aria-hidden="true">
                <span className="text-base">🥋</span>
              </div>
            )}
            <span className="font-semibold text-sm text-primary-foreground text-outlined truncate max-w-[140px]">
              {settings.dojo_name}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/20 h-9 w-9 focus-visible:ring-2 focus-visible:ring-primary-foreground"
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

      {/* Sidebar */}
      <aside
        id="mobile-sidebar"
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-primary border-r border-primary/20 flex flex-col transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        role="navigation"
        aria-label="Menu lateral"
      >
        <NavContent />
      </aside>

      {/* Main Content */}
      <main id="main-content" className="lg:pl-64 pt-14 lg:pt-0 min-h-screen" tabIndex={-1}>
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
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}

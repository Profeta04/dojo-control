import { ReactNode, useState, useEffect } from "react";
import dojoLogo from "@/assets/dojo-control-logo.png";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDojoSettings } from "@/hooks/useDojoSettings";
import { Link } from "react-router-dom";
import { useDojoContext } from "@/hooks/useDojoContext";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Menu, X, Building, Settings, ScanLine } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { BlockedStudentScreen } from "@/components/auth/BlockedStudentScreen";
import { supabase } from "@/integrations/supabase/client";
import { StudentBottomNav } from "./StudentBottomNav";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarNavContent } from "./sidebar/SidebarNavContent";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { profile, canManageStudents, isStudent } = useAuth();
  const { settings } = useDojoSettings();
  const { currentDojoId, setCurrentDojoId, userDojos, isLoadingDojos } = useDojoContext();
  const { getSignedUrl } = useSignedUrl();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navMode = localStorage.getItem(`nav-mode-${profile?.user_id}`) || "bottom";
  const useBottomNav = navMode === "bottom";
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const currentDojo = userDojos.find(d => d.id === currentDojoId) || userDojos[0];
  const showDojoSelector = userDojos.length > 1 && canManageStudents;

  useEffect(() => {
    const loadLogoUrl = async () => {
      if (currentDojo?.logo_url) {
        if (currentDojo.logo_url.startsWith('http')) {
          setLogoUrl(currentDojo.logo_url);
        } else {
          const signedUrl = await getSignedUrl('dojo-logos', currentDojo.logo_url);
          if (signedUrl) {
            setLogoUrl(signedUrl);
          } else {
            const { data } = supabase.storage.from('dojo-logos').getPublicUrl(currentDojo.logo_url);
            setLogoUrl(data?.publicUrl || null);
          }
        }
      } else {
        setLogoUrl(null);
      }
    };
    loadLogoUrl();
  }, [currentDojo?.logo_url, getSignedUrl]);

  return (
    <div className="min-h-screen bg-background">
      {/* Student bottom nav on mobile */}
      {useBottomNav && <StudentBottomNav />}

      {/* Skip to main content */}
      <a href="#main-content" className="skip-to-main" tabIndex={0}>
        Pular para o conteúdo principal
      </a>

      {/* Student Mobile Top Bar */}
      {useBottomNav && (
        <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border safe-area-inset-top">
          <div className="h-14 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <img src={dojoLogo} alt="Dojo Control" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
              )}
              {showDojoSelector && !isLoadingDojos ? (
                <Select
                  value={currentDojoId || "all"}
                  onValueChange={(value) => setCurrentDojoId(value === "all" ? null : value)}
                >
                  <SelectTrigger className="h-8 text-xs bg-sidebar-accent/30 border-sidebar-border text-sidebar-foreground max-w-[160px]">
                    <SelectValue placeholder="Selecione o dojo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os dojos</SelectItem>
                    {userDojos.map((dojo) => (
                      <SelectItem key={dojo.id} value={dojo.id}>{dojo.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="font-semibold text-base text-sidebar-foreground truncate">
                  {currentDojo?.name || settings.dojo_name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {isStudent && !canManageStudents && (
                <Link to="/scanner">
                  <Button variant="ghost" size="icon" className="relative text-accent hover:bg-accent/10">
                    <ScanLine className="h-5 w-5" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent animate-pulse" />
                  </Button>
                </Link>
              )}
              <Link to="/config">
                <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent">
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
              <NotificationBell />
            </div>
          </div>
        </header>
      )}

      {/* Mobile Header for sidebar mode */}
      <header
        className={cn(
          "lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border safe-area-inset-top",
          useBottomNav && "hidden"
        )}
        role="banner"
      >
        <div className="h-14 px-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <img src={dojoLogo} alt="Dojo Control" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
            )}
            <span className="font-semibold text-sm text-sidebar-foreground truncate">
              {currentDojo?.name || settings.dojo_name}
            </span>
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground hover:bg-sidebar-accent h-10 w-10 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-expanded={sidebarOpen}
              aria-controls="mobile-sidebar"
              aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && !useBottomNav && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex fixed top-0 left-0 z-40 h-full w-64 bg-sidebar border-r border-sidebar-border flex-col"
        role="navigation"
        aria-label="Menu lateral desktop"
      >
        <SidebarNavContent logoUrl={logoUrl} />
      </aside>

      {/* Mobile Sidebar */}
      {!useBottomNav && (
        <aside
          id="mobile-sidebar"
          className={cn(
            "lg:hidden fixed top-0 left-0 z-50 h-full w-[280px] bg-sidebar border-r border-sidebar-border flex flex-col",
            "transition-transform duration-300 ease-out will-change-transform",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
          role="navigation"
          aria-label="Menu lateral mobile"
        >
          <SidebarNavContent logoUrl={logoUrl} onCloseMobile={() => setSidebarOpen(false)} />
        </aside>
      )}

      {/* Main Content */}
      <main id="main-content" className="lg:pl-64 min-h-screen w-full min-w-0 overflow-x-hidden" tabIndex={-1}>
        <div className={cn("lg:hidden safe-area-inset-top", "h-14")} />

        {/* Desktop header */}
        <div className="hidden lg:flex items-center justify-between h-14 px-6 border-b border-border/50" role="banner">
          {showDojoSelector && !isLoadingDojos ? (
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
                    <SelectItem key={dojo.id} value={dojo.id}>{dojo.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : <div />}
          <NotificationBell />
        </div>

        <div
          className={cn("p-3 sm:p-4 lg:p-6", !useBottomNav && "safe-area-inset-bottom")}
          style={useBottomNav ? { paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" } : undefined}
        >
          {isStudent && !canManageStudents && (profile as any)?.is_blocked && location.pathname !== "/mensalidade" ? (
            <BlockedStudentScreen reason={(profile as any)?.blocked_reason} />
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}

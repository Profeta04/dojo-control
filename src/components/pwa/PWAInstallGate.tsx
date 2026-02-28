import { useState, useEffect } from "react";
import { Download, Smartphone, Share, PlusSquare, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import dojoLogo from "@/assets/dojo-control-logo.png";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if ((navigator as any).standalone === true) return true;
  if (document.referrer.includes("android-app://")) return true;
  return false;
}

function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export function PWAInstallGate({ children }: { children: React.ReactNode }) {
  const [installed, setInstalled] = useState(true); // default true to avoid flash
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const isIOS = isIOSDevice();

  useEffect(() => {
    // Check if already installed/standalone
    setInstalled(isStandalone());

    // Listen for display-mode changes (some browsers fire this on install)
    const mq = window.matchMedia("(display-mode: standalone)");
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setInstalled(true);
    };
    mq.addEventListener("change", handler);

    // Listen for the install prompt (Chrome/Edge/Android)
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // Detect app installed event
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => {
      mq.removeEventListener("change", handler);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  // If already installed as PWA, render children normally
  if (installed) return <>{children}</>;

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
      }
    } catch {
      // ignore
    }
    setInstalling(false);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8 safe-area-inset">
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-accent/[0.06] rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full">
        {/* Logo */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-accent/10 rounded-full blur-xl scale-150" />
          <img
            src={dojoLogo}
            alt="Dojo Control"
            className="relative w-28 h-28 border-2 border-border rounded-full shadow-xl"
          />
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-foreground mb-3 tracking-tight">
          Dojo Control
        </h1>

        <p className="text-muted-foreground mb-8 leading-relaxed">
          Para acessar o sistema, instale o aplicativo no seu dispositivo.
        </p>

        {/* Install CTA */}
        <div className="w-full space-y-4">
          {isIOS ? (
            /* iOS install instructions */
            <div className="bg-card border border-border rounded-2xl p-6 text-left space-y-4">
              <h2 className="font-bold text-foreground text-lg flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-accent" />
                Como instalar no iPhone
              </h2>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/10 text-accent font-bold flex items-center justify-center text-xs">1</span>
                  <span>
                    Toque no botão <Share className="inline h-4 w-4 text-accent mx-0.5 -mt-0.5" /> <strong className="text-foreground">Compartilhar</strong> na barra do Safari
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/10 text-accent font-bold flex items-center justify-center text-xs">2</span>
                  <span>
                    Role para baixo e toque em <PlusSquare className="inline h-4 w-4 text-accent mx-0.5 -mt-0.5" /> <strong className="text-foreground">Adicionar à Tela de Início</strong>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/10 text-accent font-bold flex items-center justify-center text-xs">3</span>
                  <span>
                    Confirme tocando em <strong className="text-foreground">Adicionar</strong>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/10 text-accent font-bold flex items-center justify-center text-xs">4</span>
                  <span>
                    Abra o app <strong className="text-foreground">Dojo Control</strong> pela tela inicial
                  </span>
                </li>
              </ol>
            </div>
          ) : deferredPrompt ? (
            /* Android/Chrome install button */
            <Button
              onClick={handleInstallClick}
              disabled={installing}
              size="lg"
              className="w-full h-14 text-lg font-bold bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20 rounded-xl"
            >
              <Download className="h-5 w-5 mr-2" />
              {installing ? "Instalando..." : "Instalar Aplicativo"}
            </Button>
          ) : (
            /* Generic fallback for browsers that don't fire beforeinstallprompt */
            <div className="bg-card border border-border rounded-2xl p-6 text-left space-y-4">
              <h2 className="font-bold text-foreground text-lg flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-accent" />
                Como instalar
              </h2>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/10 text-accent font-bold flex items-center justify-center text-xs">1</span>
                  <span>
                    Abra o menu do navegador <MoreVertical className="inline h-4 w-4 text-accent mx-0.5 -mt-0.5" />
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/10 text-accent font-bold flex items-center justify-center text-xs">2</span>
                  <span>
                    Toque em <strong className="text-foreground">"Instalar aplicativo"</strong> ou <strong className="text-foreground">"Adicionar à tela inicial"</strong>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/10 text-accent font-bold flex items-center justify-center text-xs">3</span>
                  <span>
                    Abra o app <strong className="text-foreground">Dojo Control</strong> pela tela inicial
                  </span>
                </li>
              </ol>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground/60 mt-8">
          O aplicativo é gratuito e funciona offline.
        </p>
      </div>
    </div>
  );
}

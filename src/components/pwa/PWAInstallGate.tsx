import { useState, useEffect } from "react";
import { Download, Smartphone, Share, PlusSquare, MoreVertical } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import dojoLogo from "@/assets/dojo-control-logo.png";

import type { Easing } from "framer-motion";

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

function isDesktop(): boolean {
  return window.innerWidth >= 1024 && !("ontouchstart" in window);
}

function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
} as const;

const pulseVariants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.05, 1] as number[],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" as const },
  },
};

const stepVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.4 + i * 0.12, duration: 0.4, ease: "easeOut" as const },
  }),
} as const;

export function PWAInstallGate({ children }: { children: React.ReactNode }) {
  const [installed, setInstalled] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const isIOS = isIOSDevice();

  useEffect(() => {
    if (isDesktop()) {
      setInstalled(true);
      return;
    }
    setInstalled(isStandalone());

    const mq = window.matchMedia("(display-mode: standalone)");
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setInstalled(true);
    };
    mq.addEventListener("change", handler);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", () => {
      setInstalled(true);
    });

    return () => {
      mq.removeEventListener("change", handler);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  if (installed) return <>{children}</>;

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
    } catch {
      // ignore
    }
    setInstalling(false);
    setDeferredPrompt(null);
  };

  const steps = isIOS
    ? [
        <>Toque no botão <Share className="inline h-4 w-4 text-accent mx-0.5 -mt-0.5" /> <strong className="text-foreground">Compartilhar</strong> na barra do Safari</>,
        <>Role para baixo e toque em <PlusSquare className="inline h-4 w-4 text-accent mx-0.5 -mt-0.5" /> <strong className="text-foreground">Adicionar à Tela de Início</strong></>,
        <>Confirme tocando em <strong className="text-foreground">Adicionar</strong></>,
        <>Abra o app <strong className="text-foreground">Dojo Control</strong> pela tela inicial</>,
      ]
    : [
        <>Abra o menu do navegador <MoreVertical className="inline h-4 w-4 text-accent mx-0.5 -mt-0.5" /></>,
        <>Toque em <strong className="text-foreground">"Instalar aplicativo"</strong> ou <strong className="text-foreground">"Adicionar à tela inicial"</strong></>,
        <>Abra o app <strong className="text-foreground">Dojo Control</strong> pela tela inicial</>,
      ];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8 safe-area-inset relative overflow-hidden">
      {/* Animated background glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-accent/[0.06] rounded-full blur-3xl"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      <motion.div
        className="relative z-10 flex flex-col items-center text-center max-w-sm w-full"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo with pulse */}
        <motion.div className="relative mb-8" variants={itemVariants}>
          <div className="absolute inset-0 bg-accent/10 rounded-full blur-xl scale-150" />
          <motion.img
            src={dojoLogo}
            alt="Dojo Control"
            className="relative w-28 h-28 border-2 border-border rounded-full shadow-xl"
            variants={pulseVariants}
            initial="initial"
            animate="animate"
          />
        </motion.div>

        <motion.h1
          className="text-3xl sm:text-4xl font-black text-foreground mb-3 tracking-tight"
          variants={itemVariants}
        >
          Dojo Control
        </motion.h1>

        <motion.p
          className="text-muted-foreground mb-8 leading-relaxed"
          variants={itemVariants}
        >
          Para acessar o sistema, instale o aplicativo no seu dispositivo.
        </motion.p>

        {/* Install CTA */}
        <motion.div className="w-full space-y-4" variants={itemVariants}>
          {deferredPrompt && !isIOS ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
            >
              <Button
                onClick={handleInstallClick}
                disabled={installing}
                size="lg"
                className="w-full h-14 text-lg font-bold bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20 rounded-xl"
              >
                <Download className="h-5 w-5 mr-2" />
                {installing ? "Instalando..." : "Instalar Aplicativo"}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              className="bg-card border border-border rounded-2xl p-6 text-left space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <h2 className="font-bold text-foreground text-lg flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-accent" />
                {isIOS ? "Como instalar no iPhone" : "Como instalar"}
              </h2>
              <ol className="space-y-3 text-sm text-muted-foreground">
                {steps.map((content, i) => (
                  <motion.li
                    key={i}
                    className="flex items-start gap-3"
                    custom={i}
                    variants={stepVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/10 text-accent font-bold flex items-center justify-center text-xs">
                      {i + 1}
                    </span>
                    <span>{content}</span>
                  </motion.li>
                ))}
              </ol>
            </motion.div>
          )}
        </motion.div>

        <motion.p
          className="text-xs text-muted-foreground/60 mt-8"
          variants={itemVariants}
        >
          O aplicativo é gratuito e funciona offline.
        </motion.p>
      </motion.div>
    </div>
  );
}

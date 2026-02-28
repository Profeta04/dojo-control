import { useState, useEffect } from "react";
import { Download, Smartphone, Share, PlusSquare, MoreVertical, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

function isDesktop(): boolean {
  return window.innerWidth >= 1024 && !("ontouchstart" in window);
}

function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

type InstallPhase = "prompt" | "installing" | "success";

// ─── Animation Variants ─────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

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
};

// ─── Installing Screen ──────────────────────────────────────────

function InstallingScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        // Slow progress: ~20s to reach 90%
        return prev + Math.random() * 4 + 1;
      });
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8 safe-area-inset relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-accent/[0.06] rounded-full blur-3xl"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-accent/10 rounded-full blur-xl scale-150" />
          <motion.img
            src={dojoLogo}
            alt="Dojo Control"
            className="relative w-28 h-28 border-2 border-border rounded-full shadow-xl"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
        </div>

        <motion.h2
          className="text-2xl font-bold text-foreground mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Instalando o app...
        </motion.h2>

        <motion.p
          className="text-muted-foreground mb-8 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Aguarde enquanto o Dojo Control é preparado para você.
        </motion.p>

        {/* Progress bar */}
        <motion.div
          className="w-full max-w-xs h-2 bg-muted rounded-full overflow-hidden"
          initial={{ opacity: 0, scaleX: 0.8 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.3 }}
        >
          <motion.div
            className="h-full bg-accent rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.4 }}
          />
        </motion.div>

        <motion.p
          className="text-xs text-muted-foreground/60 mt-4"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Preparando recursos offline...
        </motion.p>
      </div>
    </motion.div>
  );
}

// ─── Success Screen ─────────────────────────────────────────────

function SuccessScreen() {
  return (
    <motion.div
      className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8 safe-area-inset relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-success/[0.06] rounded-full blur-3xl"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full">
        {/* Animated check */}
        <motion.div
          className="relative mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
        >
          <div className="absolute inset-0 bg-success/15 rounded-full blur-2xl scale-[2]" />
          <div className="relative w-28 h-28 rounded-full bg-success/10 border-2 border-success/30 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 250, delay: 0.5 }}
            >
              <CheckCircle2 className="h-14 w-14 text-success" />
            </motion.div>
          </div>
        </motion.div>

        <motion.h1
          className="text-3xl sm:text-4xl font-black text-foreground mb-3 tracking-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          App Instalado!
        </motion.h1>

        <motion.p
          className="text-muted-foreground mb-8 leading-relaxed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          O Dojo Control foi instalado com sucesso no seu dispositivo.
        </motion.p>

        <motion.div
          className="w-full bg-card border border-border rounded-2xl p-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Smartphone className="h-6 w-6 text-accent" />
            </div>
            <div className="text-left">
              <p className="font-bold text-foreground text-sm">Abra pela tela inicial</p>
              <p className="text-xs text-muted-foreground">
                Feche o navegador e abra o <strong className="text-foreground">Dojo Control</strong> pelo ícone na tela inicial do celular.
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <motion.div
              className="flex items-center justify-center gap-2 text-accent font-semibold text-sm"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <img src={dojoLogo} alt="" className="w-6 h-6 rounded-md" />
              Procure este ícone na sua tela inicial
            </motion.div>
          </div>
        </motion.div>

        <motion.p
          className="text-xs text-muted-foreground/60 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
        >
          O app funciona offline e é totalmente gratuito.
        </motion.p>
      </div>
    </motion.div>
  );
}

// ─── Prompt Screen ──────────────────────────────────────────────

function PromptScreen({
  deferredPrompt,
  isIOS,
  onInstall,
  installing,
}: {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isIOS: boolean;
  onInstall: () => void;
  installing: boolean;
}) {
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
    <motion.div
      className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8 safe-area-inset relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
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

        <motion.div className="w-full space-y-4" variants={itemVariants}>
          {deferredPrompt && !isIOS ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
            >
              <Button
                onClick={onInstall}
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
    </motion.div>
  );
}

// ─── Main Gate ──────────────────────────────────────────────────

export function PWAInstallGate({ children }: { children: React.ReactNode }) {
  const [installed, setInstalled] = useState(true);
  const [phase, setPhase] = useState<InstallPhase>("prompt");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
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

    if ((window as any).__pwaInstallPrompt) {
      setDeferredPrompt((window as any).__pwaInstallPrompt);
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      (window as any).__pwaInstallPrompt = e;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", () => {
      setPhase("success");
      (window as any).__pwaInstallPrompt = null;
    });

    return () => {
      mq.removeEventListener("change", handler);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  // Polling fallback: check standalone mode every 2s while installing
  useEffect(() => {
    if (phase !== "installing") return;
    const interval = setInterval(() => {
      if (isStandalone()) {
        setPhase("success");
        clearInterval(interval);
      }
    }, 2000);
    // Timeout fallback: after 30s assume installed if user accepted
    const timeout = setTimeout(() => {
      if (phase === "installing") setPhase("success");
    }, 30000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [phase]);

  if (installed && phase !== "success" && phase !== "installing") return <>{children}</>;

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    setPhase("installing");
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome !== "accepted") {
        setPhase("prompt");
        return;
      }
      // Wait for appinstalled event or polling fallback
    } catch {
      setPhase("prompt");
    }
    setDeferredPrompt(null);
  };

  return (
    <AnimatePresence mode="wait">
      {phase === "installing" && <InstallingScreen key="installing" />}
      {phase === "success" && <SuccessScreen key="success" />}
      {phase === "prompt" && (
        <PromptScreen
          key="prompt"
          deferredPrompt={deferredPrompt}
          isIOS={isIOS}
          onInstall={handleInstallClick}
          installing={false}
        />
      )}
    </AnimatePresence>
  );
}

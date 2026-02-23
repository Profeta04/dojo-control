import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function Scanner() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  const initScanner = useCallback(() => {
    if (cameraReady || scannerRef.current) return;
    setCameraReady(true);
  }, [cameraReady]);

  // Auto-check camera permission on mount
  useEffect(() => {
    const check = async () => {
      try {
        const result = await navigator.permissions.query({ name: "camera" as PermissionName });
        if (result.state === "granted") {
          initScanner();
        }
      } catch {
        // permissions API not supported
      }
    };
    check();
  }, [initScanner]);

  const requestCameraAndStart = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      initScanner();
    } catch {
      setError("Permissão da câmera negada. Habilite nas configurações do navegador.");
    }
  };

  // Start html5-qrcode when camera is ready
  useEffect(() => {
    if (!cameraReady) return;

    const scanner = new Html5Qrcode("qr-reader-video");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          const match = decodedText.match(/\/checkin\/([a-f0-9-]+)/i);
          if (match) {
            setScanSuccess(true);
            scanner.stop().catch(() => {});
            setTimeout(() => navigate(`/checkin/${match[1]}`), 800);
          } else {
            toast({
              title: "QR Code inválido",
              description: "Este QR Code não é de um dojo.",
              variant: "destructive",
            });
          }
        },
        () => {}
      )
      .then(() => setStarted(true))
      .catch(() => {
        setError("Não foi possível acessar a câmera.");
      });

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [cameraReady, navigate, toast]);

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-4 pb-24">
      {/* Back button */}
      <div className="absolute top-4 left-4 safe-area-inset-top z-20">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="bg-background/80 backdrop-blur-sm">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      <div className="w-full max-w-[min(22rem,85vw)] space-y-5">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-1"
        >
          <h1 className="text-xl font-bold text-foreground">Scanner de Presença</h1>
          <p className="text-sm text-muted-foreground">
            Aponte a câmera para o QR Code do cartaz de presença do dojo para registrar seu check-in automaticamente.
          </p>
        </motion.div>

        {error ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4 py-8"
          >
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <Camera className="h-10 w-10 text-destructive/60" />
            </div>
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={() => { setError(null); setCameraReady(false); }}>
              Tentar novamente
            </Button>
          </motion.div>
        ) : !cameraReady ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6 py-8"
          >
            <div className="relative w-24 h-24 mx-auto">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-24 h-24 rounded-full bg-accent/10 flex items-center justify-center"
              >
                <Camera className="h-12 w-12 text-accent" />
              </motion.div>
              <motion.div
                animate={{ scale: [1, 1.4], opacity: [0.4, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full border-2 border-accent"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Precisamos da câmera para ler o QR Code do dojo.
            </p>
            <Button onClick={requestCameraAndStart} className="gap-2" size="lg">
              <Camera className="h-4 w-4" />
              Permitir Câmera
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative"
          >
            {/* Square scanner viewport - uses aspect-ratio to stay square */}
            <div className="relative w-full aspect-square mx-auto overflow-hidden rounded-2xl">
              {/* html5-qrcode mounts here */}
              <div
                id="qr-reader-video"
                className="absolute inset-0 [&_video]:!w-full [&_video]:!h-full [&_video]:!object-cover [&_video]:!rounded-2xl [&>div]:!border-none [&_img]:!hidden"
              />

              {/* Overlay with corners and scan line */}
              <div className="absolute inset-0 rounded-2xl pointer-events-none z-10">
                <div className="absolute inset-0 rounded-2xl border-2 border-accent/50" />

                {started && !scanSuccess && (
                  <motion.div
                    animate={{ top: ["5%", "90%", "5%"] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute left-3 right-3 h-0.5 bg-accent rounded-full shadow-[0_0_8px_hsl(var(--accent))]"
                  />
                )}

                <ScanCorners />
              </div>

              {/* Loading overlay */}
              {!started && (
                <div className="absolute inset-0 rounded-2xl bg-muted/80 flex items-center justify-center z-20">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  >
                    <Camera className="h-10 w-10 text-accent" />
                  </motion.div>
                </div>
              )}

              {/* Success overlay */}
              <AnimatePresence>
                {scanSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 rounded-2xl bg-accent/90 flex items-center justify-center z-20"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200 }}
                    >
                      <ShieldCheck className="h-16 w-16 text-accent-foreground" />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-4">
              {scanSuccess ? "Presença detectada!" : "Posicione o QR Code dentro do quadro"}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function ScanCorners() {
  const color = "hsl(var(--accent))";

  return (
    <>
      {/* Top-left */}
      <svg className="absolute top-3 left-3" width="24" height="24">
        <path d="M0 24 L0 0 L24 0" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </svg>
      {/* Top-right */}
      <svg className="absolute top-3 right-3" width="24" height="24">
        <path d="M0 0 L24 0 L24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </svg>
      {/* Bottom-left */}
      <svg className="absolute bottom-3 left-3" width="24" height="24">
        <path d="M0 0 L0 24 L24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </svg>
      {/* Bottom-right */}
      <svg className="absolute bottom-3 right-3" width="24" height="24">
        <path d="M24 0 L24 24 L0 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </svg>
    </>
  );
}

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScanLine, ArrowLeft, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Scanner() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          // Check if it's a valid checkin URL
          const match = decodedText.match(/\/checkin\/([a-f0-9-]+)/i);
          if (match) {
            scanner.stop().catch(() => {});
            navigate(`/checkin/${match[1]}`);
          } else {
            toast({
              title: "QR Code inválido",
              description: "Este QR Code não é de um dojo.",
              variant: "destructive",
            });
          }
        },
        () => {} // ignore scan failures
      )
      .then(() => setStarted(true))
      .catch((err) => {
        setError(
          err?.message?.includes("NotAllowed") || err?.toString?.().includes("NotAllowed")
            ? "Permissão da câmera negada. Habilite nas configurações do navegador."
            : "Não foi possível acessar a câmera."
        );
      });

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 pb-24">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Camera className="h-5 w-5 text-accent" />
              Scanner de Presença
            </h1>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Aponte a câmera para o QR Code do dojo para registrar presença.
          </p>

          {error ? (
            <div className="text-center space-y-3 py-6">
              <ScanLine className="h-12 w-12 mx-auto text-destructive/60" />
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Tentar novamente
              </Button>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
              <div id="qr-reader" className="w-full h-full" />
              {!started && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <ScanLine className="h-10 w-10 text-accent animate-pulse" />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface DojoQRCodeProps {
  dojoId: string;
  dojoName: string;
  checkinToken: string;
  logoUrl?: string | null;
  colorPrimary?: string | null;
  colorAccent?: string | null;
}

export function DojoQRCode({ dojoId, dojoName, checkinToken, logoUrl }: DojoQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posterCanvasRef = useRef<HTMLCanvasElement>(null);
  const [regenerating, setRegenerating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const checkinUrl = `${window.location.origin}/checkin/${checkinToken}`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = 280;
    const logoSize = 60;

    QRCode.toCanvas(canvas, checkinUrl, {
      width: size,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#000000", light: "#ffffff" },
    }, () => {
      // Draw logo on top of QR code center
      if (!logoUrl) {
        drawFallbackLogo(canvas, dojoName, logoSize);
        return;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const pad = 6;

        // White background behind logo
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(cx - logoSize / 2 - pad, cy - logoSize / 2 - pad, logoSize + pad * 2, logoSize + pad * 2);

        // Draw logo
        ctx.drawImage(img, cx - logoSize / 2, cy - logoSize / 2, logoSize, logoSize);
      };
      img.onerror = () => drawFallbackLogo(canvas, dojoName, logoSize);
      img.src = logoUrl;
    });
  }, [checkinUrl, logoUrl, dojoName]);

  const handleDownload = () => {
    const qrCanvas = canvasRef.current;
    if (!qrCanvas) return;

    // Create poster canvas
    const posterW = 800;
    const posterH = 1100;
    const poster = document.createElement("canvas");
    poster.width = posterW;
    poster.height = posterH;
    const ctx = poster.getContext("2d");
    if (!ctx) return;

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, posterW, posterH);

    // Top accent bar
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, posterW, 8);

    // Dojo name
    ctx.fillStyle = "#111111";
    ctx.font = "bold 38px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(dojoName.toUpperCase(), posterW / 2, 80);

    // Divider line
    ctx.strokeStyle = "#e5e5e5";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(posterW * 0.2, 105);
    ctx.lineTo(posterW * 0.8, 105);
    ctx.stroke();

    // Instruction text
    ctx.fillStyle = "#333333";
    ctx.font = "600 26px system-ui, -apple-system, sans-serif";
    ctx.fillText("📱 Escaneie o QR Code abaixo", posterW / 2, 160);
    ctx.fillText("para marcar sua presença", posterW / 2, 195);

    // QR Code - centered, large
    const qrSize = 450;
    const qrX = (posterW - qrSize) / 2;
    const qrY = 240;

    // QR border/shadow
    ctx.shadowColor = "rgba(0,0,0,0.08)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    roundRect(ctx, qrX - 20, qrY - 20, qrSize + 40, qrSize + 40, 16);
    ctx.fill();
    ctx.shadowColor = "transparent";

    ctx.strokeStyle = "#e5e5e5";
    ctx.lineWidth = 1;
    ctx.beginPath();
    roundRect(ctx, qrX - 20, qrY - 20, qrSize + 40, qrSize + 40, 16);
    ctx.stroke();

    // Draw QR
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    // Steps section
    const stepsY = qrY + qrSize + 60;

    ctx.fillStyle = "#111111";
    ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Como funciona?", posterW / 2, stepsY);

    const steps = [
      "1️⃣  Abra a câmera do celular",
      "2️⃣  Aponte para o QR Code acima",
      "3️⃣  Confirme sua presença no app",
    ];

    ctx.fillStyle = "#555555";
    ctx.font = "500 20px system-ui, -apple-system, sans-serif";
    steps.forEach((step, i) => {
      ctx.fillText(step, posterW / 2, stepsY + 40 + i * 36);
    });

    // Footer
    ctx.fillStyle = "#999999";
    ctx.font = "400 14px system-ui, -apple-system, sans-serif";
    ctx.fillText("Presença registrada automaticamente • Dojo Control", posterW / 2, posterH - 40);

    // Bottom accent bar
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, posterH - 8, posterW, 8);

    // Download
    const link = document.createElement("a");
    link.download = `cartaz-presenca-${dojoName.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = poster.toDataURL("image/png");
    link.click();
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const newToken = crypto.randomUUID();
      const { error } = await supabase
        .from("dojos")
        .update({ checkin_token: newToken } as any)
        .eq("id", dojoId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["dojos"] });
      queryClient.invalidateQueries({ queryKey: ["user-dojos"] });
      toast({ title: "QR Code regenerado!", description: "O código antigo foi invalidado." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col items-center gap-5 pt-6 pb-6">
        <canvas ref={canvasRef} className="rounded-xl shadow-lg" />

        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">QR Code de Presença</p>
          <p className="text-xs text-muted-foreground max-w-[280px]">
            Baixe o cartaz pronto para imprimir e colar na parede do dojo.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1.5" />
            Baixar Cartaz
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={regenerating}
          >
            {regenerating ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1.5" />
            )}
            Regenerar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Helpers ---

function drawFallbackLogo(canvas: HTMLCanvasElement, name: string, logoSize: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const pad = 6;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(cx - logoSize / 2 - pad, cy - logoSize / 2 - pad, logoSize + pad * 2, logoSize + pad * 2);

  ctx.fillStyle = "#111111";
  ctx.font = `bold ${logoSize * 0.6}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name.charAt(0).toUpperCase(), cx, cy);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
}

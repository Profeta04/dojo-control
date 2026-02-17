import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, RefreshCw, Loader2, Sun, Moon } from "lucide-react";
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

function toHex(val: string | null | undefined, fallback: string): string {
  if (!val) return fallback;
  if (val.startsWith("#")) return val;
  // HSL string "262 83% 58%" → convert to hex
  const parts = val.trim().split(/\s+/);
  if (parts.length >= 3) {
    const h = parseFloat(parts[0]);
    const s = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;
    return hslToHex(h, s, l);
  }
  return fallback;
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * Math.max(0, Math.min(1, color))).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function DojoQRCode({ dojoId, dojoName, checkinToken, logoUrl, colorPrimary, colorAccent }: DojoQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [regenerating, setRegenerating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const checkinUrl = `${window.location.origin}/checkin/${checkinToken}`;
  const primary = toHex(colorPrimary, "#6d28d9");
  const accent = toHex(colorAccent, "#f59e0b");

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
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(cx - logoSize / 2 - pad, cy - logoSize / 2 - pad, logoSize + pad * 2, logoSize + pad * 2);
        ctx.drawImage(img, cx - logoSize / 2, cy - logoSize / 2, logoSize, logoSize);
      };
      img.onerror = () => drawFallbackLogo(canvas, dojoName, logoSize);
      img.src = logoUrl;
    });
  }, [checkinUrl, logoUrl, dojoName]);

  // Read current CSS variable as HSL and convert to hex
  const cssVarToHex = (varName: string, fallback: string): string => {
    const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return val ? toHex(val, fallback) : fallback;
  };

  const handleDownload = (mode: "light" | "dark") => {
    const qrCanvas = canvasRef.current;
    if (!qrCanvas) return;

    const isDark = mode === "dark";
    
    // Use theme-derived colors based on mode
    // For the current mode, read live CSS vars; for the other, use known defaults
    const bg = isDark ? toHex("220 15% 8%", "#1a1a2e") : toHex("220 15% 96%", "#f2f3f5");
    const cardBg = isDark ? toHex("220 15% 12%", "#1c2333") : "#ffffff";
    const textMain = isDark ? toHex("220 10% 93%", "#eaeced") : toHex("220 15% 10%", "#1a1d24");
    const textSub = isDark ? toHex("220 10% 65%", "#9da3ad") : toHex("220 10% 40%", "#5c6370");
    const textFooter = isDark ? toHex("220 10% 35%", "#525861") : toHex("220 10% 70%", "#aab0b8");
    const shadowColor = isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.1)";
    const stepsBg = isDark ? primary + "1A" : primary + "0D";

    const posterW = 800;
    const posterH = 1100;
    const poster = document.createElement("canvas");
    poster.width = posterW;
    poster.height = posterH;
    const ctx = poster.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, posterW, posterH);

    // Top accent bar with dojo primary color
    ctx.fillStyle = primary;
    ctx.fillRect(0, 0, posterW, 10);

    // Thin accent line below
    ctx.fillStyle = accent;
    ctx.fillRect(0, 10, posterW, 4);

    // Dojo name
    ctx.fillStyle = primary;
    ctx.font = "bold 42px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(dojoName.toUpperCase(), posterW / 2, 85);

    // Divider with accent color
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(posterW * 0.25, 110);
    ctx.lineTo(posterW * 0.75, 110);
    ctx.stroke();

    // Instruction text
    ctx.fillStyle = textMain;
    ctx.font = "600 28px system-ui, -apple-system, sans-serif";
    ctx.fillText("Escaneie o QR Code abaixo", posterW / 2, 165);
    ctx.fillStyle = primary;
    ctx.font = "bold 30px system-ui, -apple-system, sans-serif";
    ctx.fillText("para marcar sua presença!", posterW / 2, 205);

    // QR Code - centered, large
    const qrSize = 420;
    const qrX = (posterW - qrSize) / 2;
    const qrY = 250;

    // QR card with primary border
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = cardBg;
    ctx.beginPath();
    roundRect(ctx, qrX - 24, qrY - 24, qrSize + 48, qrSize + 48, 20);
    ctx.fill();
    ctx.shadowColor = "transparent";

    ctx.strokeStyle = primary;
    ctx.lineWidth = 3;
    ctx.beginPath();
    roundRect(ctx, qrX - 24, qrY - 24, qrSize + 48, qrSize + 48, 20);
    ctx.stroke();

    // Accent inner border
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    roundRect(ctx, qrX - 16, qrY - 16, qrSize + 32, qrSize + 32, 14);
    ctx.stroke();

    // Draw QR (always white bg for readability)
    if (isDark) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(qrX, qrY, qrSize, qrSize);
    }
    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    // Steps section
    const stepsY = qrY + qrSize + 70;

    // Steps background pill
    ctx.fillStyle = stepsBg;
    ctx.beginPath();
    roundRect(ctx, posterW * 0.12, stepsY - 30, posterW * 0.76, 170, 16);
    ctx.fill();

    ctx.fillStyle = primary;
    ctx.font = "bold 24px system-ui, -apple-system, sans-serif";
    ctx.fillText("Como funciona?", posterW / 2, stepsY);

    const steps = [
      "1.  Abra a câmera do celular",
      "2.  Aponte para o QR Code acima",
      "3.  Confirme sua presença no app",
    ];

    ctx.fillStyle = textSub;
    ctx.font = "500 20px system-ui, -apple-system, sans-serif";
    steps.forEach((step, i) => {
      ctx.fillText(step, posterW / 2, stepsY + 40 + i * 36);
    });

    // Footer
    ctx.fillStyle = textFooter;
    ctx.font = "400 14px system-ui, -apple-system, sans-serif";
    ctx.fillText("Presença registrada automaticamente • Dojo Control", posterW / 2, posterH - 50);

    // Bottom accent bar
    ctx.fillStyle = accent;
    ctx.fillRect(0, posterH - 14, posterW, 4);
    ctx.fillStyle = primary;
    ctx.fillRect(0, posterH - 10, posterW, 10);

    // Download
    const link = document.createElement("a");
    link.download = `cartaz-presenca-${mode}-${dojoName.toLowerCase().replace(/\s+/g, "-")}.png`;
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
        <div className="w-full flex justify-center">
          <canvas
            ref={canvasRef}
            className="rounded-xl shadow-lg"
            style={{ width: 220, height: 220 }}
          />
        </div>

        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">QR Code de Presença</p>
          <p className="text-xs text-muted-foreground max-w-[280px]">
            Baixe o cartaz pronto para imprimir e colar na parede do dojo.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap justify-center">
          <Button variant="outline" size="sm" onClick={() => handleDownload("light")}>
            <Sun className="h-4 w-4 mr-1.5" />
            Cartaz Claro
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleDownload("dark")}>
            <Moon className="h-4 w-4 mr-1.5" />
            Cartaz Escuro
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

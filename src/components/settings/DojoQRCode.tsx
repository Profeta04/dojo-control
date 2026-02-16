import { useEffect, useRef, useState, useCallback } from "react";
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

// Convert hex to HSL components
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function DojoQRCode({ dojoId, dojoName, checkinToken, logoUrl, colorPrimary, colorAccent }: DojoQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [regenerating, setRegenerating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const checkinUrl = `${window.location.origin}/checkin/${checkinToken}`;

  // Get dojo colors or defaults - handle HSL values stored as "h s% l%"
  const toColor = (val: string | null | undefined, fallback: string): string => {
    if (!val) return fallback;
    if (val.startsWith("#") || val.startsWith("rgb") || val.startsWith("hsl")) return val;
    // Assume HSL without wrapper: "262 83% 58%" → "hsl(262, 83%, 58%)"
    const parts = val.trim().split(/\s+/);
    if (parts.length >= 3) return `hsl(${parts[0]}, ${parts[1]}, ${parts[2]})`;
    return fallback;
  };

  const primary = toColor(colorPrimary, "#6d28d9");
  const accent = toColor(colorAccent, "#f59e0b");

  const renderQR = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = 600;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Generate QR matrix
    const qrData = QRCode.create(checkinUrl, { errorCorrectionLevel: "H" });
    const modules = qrData.modules;
    const moduleCount = modules.size;

    const cx = size / 2;
    const cy = size / 2;
    const outerRadius = size / 2;
    const logoZoneRadius = size * 0.18;

    // Clear
    ctx.clearRect(0, 0, size, size);

    // Dark circular background using primary color
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
    ctx.fillStyle = primary;
    ctx.fill();
    ctx.restore();

    // Map QR modules into circular/radial layout with capsule shapes
    const padding = 50;
    const qrAreaSize = size - padding * 2;
    const moduleSize = qrAreaSize / moduleCount;

    // Draw individual circular dots (white on dark, like Kik style)
    const dotRadius = moduleSize * 0.42;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, outerRadius - 2, 0, Math.PI * 2);
    ctx.clip();

    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (!modules.get(row, col)) continue;

        const x = padding + col * moduleSize + moduleSize / 2;
        const y = padding + row * moduleSize + moduleSize / 2;

        // Skip dots in logo zone
        const distFromCenter = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (distFromCenter < logoZoneRadius + moduleSize * 1.5) continue;

        // Skip dots outside the circle
        if (distFromCenter > outerRadius - 12) continue;

        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }
    }

    ctx.restore();

    // Draw center circle for logo (white)
    const logoBgRadius = logoZoneRadius + 6;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, logoBgRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();

    // Draw logo or fallback
    if (logoUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, logoZoneRadius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(
          img,
          cx - logoZoneRadius,
          cy - logoZoneRadius,
          logoZoneRadius * 2,
          logoZoneRadius * 2
        );
        ctx.restore();
      };
      img.onerror = () => drawFallbackLogo(ctx, cx, cy, logoZoneRadius, dojoName, primary);
      img.src = logoUrl;
    } else {
      drawFallbackLogo(ctx, cx, cy, logoZoneRadius, dojoName, primary);
    }
  }, [checkinUrl, primary, accent, logoUrl, dojoName]);

  useEffect(() => {
    renderQR();
  }, [renderQR]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qrcode-${dojoName.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
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
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="rounded-full shadow-xl"
            style={{ width: 260, height: 260 }}
          />
          {/* Glow effect */}
          <div
            className="absolute inset-0 rounded-full opacity-20 blur-xl -z-10"
            style={{ background: `linear-gradient(135deg, ${primary}, ${accent})`, transform: "scale(1.1)" }}
          />
        </div>

        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">QR Code de Presença</p>
          <p className="text-xs text-muted-foreground max-w-[280px]">
            Imprima e cole na parede do dojo. Alunos escaneiam para registrar presença automaticamente.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1.5" />
            Baixar PNG
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

// --- Helper drawing functions ---

function isInFinderPattern(row: number, col: number, size: number): boolean {
  // Top-left
  if (row < 7 && col < 7) return true;
  // Top-right
  if (row < 7 && col >= size - 7) return true;
  // Bottom-left
  if (row >= size - 7 && col < 7) return true;
  return false;
}

function drawFinderDot(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawCustomFinderPattern(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  primary: string,
  accent: string
) {
  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = primary;
  ctx.lineWidth = radius * 0.22;
  ctx.stroke();

  // Inner filled circle
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();
}

function drawFallbackLogo(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  name: string,
  color: string
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  // Gradient background
  const grad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  grad.addColorStop(0, color);
  grad.addColorStop(1, shiftColor(color, 30));
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${radius * 0.9}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(name.charAt(0).toUpperCase(), cx, cy);
  ctx.restore();
}

function drawTextArc(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  color: string
) {
  ctx.save();
  ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const totalAngle = endAngle - startAngle;
  // Only render if there's enough space
  if (text.length === 0) { ctx.restore(); return; }

  const anglePerChar = totalAngle / (text.length + 1);

  for (let i = 0; i < text.length; i++) {
    const angle = startAngle + anglePerChar * (i + 1);
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 2);
    ctx.globalAlpha = 0.6;
    ctx.fillText(text[i], 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

function shiftColor(hex: string, amount: number): string {
  const hsl = hexToHSL(hex);
  const newL = Math.min(100, Math.max(0, hsl.l + amount));
  return `hsl(${hsl.h}, ${hsl.s}%, ${newL}%)`;
}

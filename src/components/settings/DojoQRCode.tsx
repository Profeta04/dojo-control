import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, QrCode, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface DojoQRCodeProps {
  dojoId: string;
  dojoName: string;
  checkinToken: string;
  logoUrl?: string | null;
}

export function DojoQRCode({ dojoId, dojoName, checkinToken, logoUrl }: DojoQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [regenerating, setRegenerating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const checkinUrl = `${window.location.origin}/checkin/${checkinToken}`;

  useEffect(() => {
    renderQR();
  }, [checkinToken, logoUrl]);

  const renderQR = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = 400;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Generate QR to offscreen canvas
    const qrCanvas = document.createElement("canvas");
    await QRCode.toCanvas(qrCanvas, checkinUrl, {
      width: size,
      margin: 2,
      color: { dark: "#1a1a2e", light: "#ffffff" },
      errorCorrectionLevel: "H",
    });

    // Draw circular clipped QR
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(qrCanvas, 0, 0, size, size);
    ctx.restore();

    // Draw circular border
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Draw center circle for logo
    const logoRadius = size * 0.15;
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, logoRadius + 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    // Draw logo or fallback text
    if (logoUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, logoRadius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(
          img,
          size / 2 - logoRadius,
          size / 2 - logoRadius,
          logoRadius * 2,
          logoRadius * 2
        );
        ctx.restore();
      };
      img.onerror = () => {
        drawFallbackText(ctx, size, logoRadius, dojoName);
      };
      img.src = logoUrl;
    } else {
      drawFallbackText(ctx, size, logoRadius, dojoName);
    }
  };

  const drawFallbackText = (
    ctx: CanvasRenderingContext2D,
    size: number,
    radius: number,
    name: string
  ) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#1a1a2e";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${radius * 0.8}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name.charAt(0).toUpperCase(), size / 2, size / 2);
    ctx.restore();
  };

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
      toast({ title: "QR Code regenerado!", description: "O código antigo foi invalidado." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 pt-6">
        <div className="flex items-center gap-2 text-sm font-medium">
          <QrCode className="h-4 w-4" />
          QR Code de Presença
        </div>
        <canvas
          ref={canvasRef}
          className="rounded-full border-2 border-border"
          style={{ width: 200, height: 200 }}
        />
        <p className="text-xs text-muted-foreground text-center max-w-[250px]">
          Imprima e cole na parede do dojo. Alunos escaneiam para registrar presença automaticamente.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1" />
            Baixar PNG
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={regenerating}
          >
            {regenerating ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Regenerar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

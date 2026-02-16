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

export function DojoQRCode({ dojoId, dojoName, checkinToken }: DojoQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [regenerating, setRegenerating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const checkinUrl = `${window.location.origin}/checkin/${checkinToken}`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    QRCode.toCanvas(canvas, checkinUrl, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#000000", light: "#ffffff" },
    });
  }, [checkinUrl]);

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
        <canvas ref={canvasRef} className="rounded-xl shadow-lg" />

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

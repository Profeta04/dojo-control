import { useEffect, useRef, useState } from "react";
import { createStaticPix, hasError } from "pix-utils";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PixQRCodePaymentProps {
  pixKey: string;
  amount: number;
  merchantName: string;
  merchantCity?: string;
  description?: string;
}

export function PixQRCodePayment({
  pixKey,
  amount,
  merchantName,
  merchantCity = "SAO PAULO",
  description,
}: PixQRCodePaymentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [brCode, setBrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!pixKey || amount <= 0) {
      setError("Chave Pix ou valor inválido.");
      return;
    }

    try {
      // Sanitize merchant name: max 25 chars, no special chars
      const safeName = merchantName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .substring(0, 25)
        .trim() || "Dojo";

      const safeCity = (merchantCity || "SAO PAULO")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .substring(0, 15)
        .trim();

      const pixData = createStaticPix({
        merchantName: safeName,
        merchantCity: safeCity,
        pixKey: pixKey.trim(),
        infoAdicional: description
          ? description
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .substring(0, 40)
          : undefined,
        transactionAmount: amount,
      });

      if (hasError(pixData)) {
        setError("Erro ao gerar código Pix. Verifique a chave Pix configurada.");
        return;
      }

      const code = pixData.toBRCode();
      setBrCode(code);
      setError(null);

      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, code, {
          width: 280,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        });
      }
    } catch (err) {
      console.error("Error generating Pix BR Code:", err);
      setError("Erro ao gerar QR Code Pix.");
    }
  }, [pixKey, amount, merchantName, merchantCity, description]);

  const handleCopy = async () => {
    if (!brCode) return;
    try {
      await navigator.clipboard.writeText(brCode);
      setCopied(true);
      toast({ title: "Pix Copia e Cola copiado!", description: "Cole no seu aplicativo de banco." });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <div className="p-3 rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <p className="text-sm text-destructive font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="bg-white p-3 rounded-xl shadow-sm border border-border/50">
        <canvas ref={canvasRef} />
      </div>

      <div className="text-center">
        <p className="text-2xl font-bold text-foreground">{formatCurrency(amount)}</p>
        <p className="text-xs text-muted-foreground mt-1">Escaneie o QR Code no app do banco</p>
      </div>

      {brCode && (
        <div className="w-full space-y-2">
          <div className="p-3 bg-muted/60 rounded-lg border border-border/50">
            <code className="text-[10px] font-mono break-all text-muted-foreground leading-relaxed block max-h-16 overflow-y-auto">
              {brCode}
            </code>
          </div>
          <Button
            variant={copied ? "default" : "outline"}
            size="sm"
            className="w-full"
            onClick={handleCopy}
          >
            {copied ? (
              <><CheckCircle2 className="h-4 w-4 mr-2" /> Copiado!</>
            ) : (
              <><Copy className="h-4 w-4 mr-2" /> Copiar Pix Copia e Cola</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

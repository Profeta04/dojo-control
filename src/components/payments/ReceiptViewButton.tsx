import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, FileImage } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReceiptViewButtonProps {
  receiptUrl: string | null;
  className?: string;
  showIcon?: boolean;
}

/**
 * Button component to view payment receipts with signed URL generation.
 * Uses signed URLs for secure access to private storage bucket.
 */
export function ReceiptViewButton({ 
  receiptUrl, 
  className = "",
  showIcon = true 
}: ReceiptViewButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleViewReceipt = useCallback(async () => {
    if (!receiptUrl) return;
    
    setLoading(true);
    try {
      // Extract the storage path from the URL
      let storagePath = receiptUrl;
      
      // If it's a full URL, extract just the path portion
      if (receiptUrl.includes('/storage/v1/object/')) {
        const match = receiptUrl.match(/\/storage\/v1\/object\/(?:public|sign)\/payment-receipts\/(.+?)(?:\?|$)/);
        if (match) {
          storagePath = match[1];
        }
      } else if (receiptUrl.includes('payment-receipts/')) {
        // If path includes bucket name, remove it
        const match = receiptUrl.match(/payment-receipts\/(.+?)(?:\?|$)/);
        if (match) {
          storagePath = match[1];
        }
      }

      // Generate signed URL (valid for 1 hour)
      const { data, error } = await supabase.storage
        .from("payment-receipts")
        .createSignedUrl(storagePath, 3600);

      if (error) {
        console.error("Error creating signed URL:", error);
        toast({
          title: "Erro ao abrir comprovante",
          description: "Não foi possível acessar o comprovante. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      // Open in new tab
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Error viewing receipt:", error);
      toast({
        title: "Erro ao abrir comprovante",
        description: "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [receiptUrl, toast]);

  if (!receiptUrl) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleViewReceipt}
      disabled={loading}
      className={`gap-1 ${className}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : showIcon ? (
        <FileImage className="h-4 w-4" />
      ) : null}
      Ver
      {!loading && <ExternalLink className="h-3 w-3" />}
    </Button>
  );
}

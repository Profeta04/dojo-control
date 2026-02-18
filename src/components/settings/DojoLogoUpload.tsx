import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";

interface DojoLogoUploadProps {
  currentLogoUrl: string | null;
  dojoId: string;
  onUploadComplete: (url: string) => void;
}

export function DojoLogoUpload({ currentLogoUrl, dojoId, onUploadComplete }: DojoLogoUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl);

  // Sync with parent when prop changes
  useEffect(() => {
    setPreviewUrl(currentLogoUrl);
  }, [currentLogoUrl]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Por favor, selecione uma imagem (JPG, PNG, GIF, WebP).",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo permitido é 2MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Create a unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${dojoId}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('dojo-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('dojo-logos')
        .getPublicUrl(filePath);

      // Update preview
      setPreviewUrl(publicUrl);
      
      // Notify parent
      onUploadComplete(publicUrl);

      toast({
        title: "Logo enviada com sucesso!",
        description: "A logo do dojo foi atualizada.",
      });
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Erro ao enviar logo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    setPreviewUrl(null);
    onUploadComplete('');
  };

  return (
    <div className="space-y-3">
      <Label>Logo do Dojo</Label>
      <div className="flex items-center gap-4">
        {/* Preview */}
        <div className="relative w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden bg-muted/30">
          {previewUrl ? (
            <>
              <img 
                src={previewUrl} 
                alt="Logo do dojo" 
                className="w-full h-full object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={handleRemoveLogo}
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
          )}
        </div>

        {/* Upload button */}
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id={`logo-upload-${dojoId}`}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {previewUrl ? "Alterar Logo" : "Enviar Logo"}
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            JPG, PNG ou WebP. Máximo 2MB.
          </p>
        </div>
      </div>
    </div>
  );
}

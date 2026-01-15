import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Lock } from "lucide-react";

interface GuardianPasswordGateProps {
  guardianEmail: string;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export function GuardianPasswordGate({
  guardianEmail,
  onSuccess,
  title = "Acesso Restrito",
  description = "Esta área requer autorização do responsável.",
}: GuardianPasswordGateProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      toast({
        title: "Senha obrigatória",
        description: "Digite a senha do responsável para continuar.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Call edge function to verify guardian password without affecting current session
      const { data, error } = await supabase.functions.invoke("verify-guardian-password", {
        body: { guardianEmail, password },
      });

      // Handle edge function errors
      if (error) {
        console.error("Edge function error:", error);
        toast({
          title: "Senha incorreta",
          description: "A senha do responsável está incorreta. Por favor, tente novamente.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check if verification was successful
      if (!data?.success) {
        toast({
          title: "Senha incorreta",
          description: data?.error || "A senha do responsável está incorreta.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Store verification with expiry (1 hour)
      const expiry = Date.now() + 60 * 60 * 1000;
      sessionStorage.setItem("guardian_verified", JSON.stringify({ expiry }));

      toast({
        title: "Acesso liberado",
        description: "Senha verificada com sucesso.",
      });

      onSuccess();
    } catch (error: any) {
      console.error("Verification error:", error);
      
      // Parse error message if it's a FunctionsHttpError
      let errorMessage = "Ocorreu um erro ao verificar a senha.";
      if (error?.message?.includes("401")) {
        errorMessage = "Senha incorreta. Por favor, tente novamente.";
      }
      
      toast({
        title: "Erro de verificação",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg mb-4">
              <p className="text-xs text-muted-foreground text-center">
                Como você é menor de idade, o acesso à área de pagamentos requer a senha do seu responsável.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="guardian-password" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Senha do Responsável
              </Label>
              <Input
                id="guardian-password"
                type="password"
                placeholder="Digite a senha do responsável"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Email do responsável: {guardianEmail}
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Verificar e Acessar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

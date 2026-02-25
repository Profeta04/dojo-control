import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, ExternalLink, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";

interface StripeConnectCardProps {
  dojoId: string;
  dojoName: string;
}

export function StripeConnectCard({ dojoId, dojoName }: StripeConnectCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ["stripe-connect-status", dojoId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("stripe-connect-status", {
        body: { dojo_id: dojoId },
      });
      if (error) throw error;
      return data as {
        connected: boolean;
        charges_enabled: boolean;
        details_submitted: boolean;
        account_id?: string;
      };
    },
    enabled: !!dojoId,
  });

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboard", {
        body: { dojo_id: dojoId },
      });
      if (error) throw error;

      if (data.already_connected) {
        toast({ title: "Conta já conectada!", description: "Sua conta Stripe já está ativa." });
        queryClient.invalidateQueries({ queryKey: ["stripe-connect-status", dojoId] });
        return;
      }

      if (data.url) {
        window.open(data.url, "_blank");
        toast({
          title: "Redirecionando para o Stripe",
          description: "Complete o cadastro na aba que abriu. Depois volte aqui e clique em atualizar.",
        });
      }
    } catch (err: any) {
      toast({ title: "Erro ao conectar", description: err.message, variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["stripe-connect-status", dojoId] });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isFullyConnected = status?.connected && status?.charges_enabled;
  const isPending = status?.connected && !status?.charges_enabled;

  return (
    <Card className={isFullyConnected ? "border-green-500/30" : isPending ? "border-warning/30" : ""}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Stripe Connect
          {isFullyConnected && (
            <Badge variant="default" className="bg-green-600 text-white text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Ativo
            </Badge>
          )}
          {isPending && (
            <Badge variant="secondary" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" /> Pendente
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isFullyConnected ? (
          <>
            <p className="text-sm text-muted-foreground">
              Sua conta Stripe está conectada e pronta para receber pagamentos via PIX.
              Os alunos verão a opção de pagar pelo Stripe na tela de pagamentos.
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono">
                {status.account_id}
              </Badge>
              <Button variant="ghost" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        ) : isPending ? (
          <>
            <p className="text-sm text-muted-foreground">
              Seu cadastro no Stripe está incompleto. Clique abaixo para continuar o processo.
            </p>
            <div className="flex gap-2">
              <Button onClick={handleConnect} disabled={connecting} className="flex-1">
                {connecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                Continuar cadastro
              </Button>
              <Button variant="outline" size="icon" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Conecte uma conta Stripe para receber pagamentos dos alunos diretamente via PIX.
              O dinheiro vai direto para sua conta — sem intermediários.
            </p>
            <Button onClick={handleConnect} disabled={connecting} className="w-full">
              {connecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
              {connecting ? "Conectando..." : "Conectar conta Stripe"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

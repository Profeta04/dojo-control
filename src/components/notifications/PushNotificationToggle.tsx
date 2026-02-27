import { BellRing, BellOff, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function PushNotificationToggle({ className }: { className?: string }) {
  const { permission, isSubscribed, isSupported, isLoading, isIOS, needsInstall, subscribe, unsubscribe } = usePushNotifications();

  // iOS but not installed as PWA — show install prompt
  if (needsInstall && isIOS) {
    const handleInstallPrompt = () => {
      toast.info("Instale o app para receber notificações", {
        description:
          'No Safari, toque no botão "Compartilhar" (ícone ⬆) e selecione "Adicionar à Tela de Início". Depois abra o app pela tela inicial.',
        duration: 8000,
      });
    };

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleInstallPrompt}
            className={cn("relative", className)}
            aria-label="Instalar para receber notificações"
          >
            <Download className="h-5 w-5 text-muted-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Instalar app para notificações</TooltipContent>
      </Tooltip>
    );
  }

  if (!isSupported) return null;

  const isBlocked = (permission as string) === "denied";

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
      toast.info("Notificações desativadas neste dispositivo.");
    } else {
      if (isBlocked) {
        toast.error("Permissão bloqueada", {
          description: isIOS
            ? 'Acesse Ajustes > Dojo Control > Notificações para permitir.'
            : "Acesse as configurações do navegador para permitir notificações.",
        });
        return;
      }
      const success = await subscribe();
      if (success) {
        toast.success("Notificações ativadas! 🔔", {
          description: "Você receberá alertas de pagamentos e novas tarefas.",
        });
      } else if ((Notification.permission as string) === "denied") {
        toast.error(
          isIOS
            ? "Permissão negada. Acesse Ajustes > Dojo Control > Notificações."
            : "Permissão negada. Verifique as configurações do navegador."
        );
      }
    }
  };

  const label = isSubscribed
    ? "Desativar notificações push"
    : isBlocked
    ? "Notificações bloqueadas"
    : "Ativar notificações push";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggle}
          disabled={isLoading}
          className={cn("relative", className)}
          aria-label={label}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isSubscribed ? (
            <BellRing className="h-5 w-5 text-primary" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

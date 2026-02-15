import { Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export function PendingApprovalScreen() {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-warning/10 border-2 border-warning/30 flex items-center justify-center">
          <Clock className="h-10 w-10 text-warning" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Aguarde a confirmação
          </h1>
          <p className="text-muted-foreground">
            Olá, <span className="font-medium text-foreground">{profile?.name?.split(" ")[0] ?? "Judoca"}</span>!
          </p>
        </div>

        {/* Message */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Seu cadastro foi recebido e está sendo analisado por um <strong className="text-foreground">Sensei</strong> ou <strong className="text-foreground">Administrador</strong> do dojo.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Você receberá acesso ao sistema assim que sua conta for aprovada.
          </p>
        </div>

        {/* Status indicator */}
        <div className="flex items-center justify-center gap-2 text-warning">
          <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
          <span className="text-sm font-medium">Cadastro pendente de aprovação</span>
        </div>

        {/* Sign out button */}
        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair da conta
        </Button>
      </div>

      {/* Footer */}
      <p className="absolute bottom-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Dojo Control
      </p>
    </div>
  );
}

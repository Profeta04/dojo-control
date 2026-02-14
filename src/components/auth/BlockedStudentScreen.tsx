import { ShieldAlert, CreditCard, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface BlockedStudentScreenProps {
  reason?: string | null;
}

export function BlockedStudentScreen({ reason }: BlockedStudentScreenProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-destructive/30 shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto p-4 rounded-full bg-destructive/10">
            <ShieldAlert className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-xl text-destructive">Acesso Restrito</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Seu acesso está temporariamente bloqueado{reason ? ` devido a: ${reason}` : " por pendências financeiras"}.
          </p>
          <p className="text-sm text-muted-foreground">
            Para regularizar sua situação, entre em contato com a administração do seu dojo ou acesse a área de pagamentos.
          </p>
          <div className="flex flex-col gap-2 pt-4">
            <Button onClick={() => navigate("/mensalidade")} className="w-full gap-2">
              <CreditCard className="h-4 w-4" />
              Ver Meus Pagamentos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

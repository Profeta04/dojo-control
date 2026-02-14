import { CheckCircle2, Upload, Clock, XCircle } from "lucide-react";
import { ReceiptStatus } from "@/lib/constants";

interface ReceiptProgressProps {
  status: ReceiptStatus | null;
  hasReceipt: boolean;
}

const steps = [
  { key: "enviado", label: "Enviado", icon: Upload },
  { key: "verificacao", label: "Verificando", icon: Clock },
  { key: "resultado", label: "Resultado", icon: CheckCircle2 },
];

export function ReceiptProgress({ status, hasReceipt }: ReceiptProgressProps) {
  if (!hasReceipt) return null;

  const currentStep = !status ? 0 
    : status === "pendente_verificacao" ? 1 
    : 2;
  
  const isRejected = status === "rejeitado";

  return (
    <div className="flex items-center gap-1 w-full max-w-[200px]">
      {steps.map((step, index) => {
        const isActive = index <= currentStep;
        const isCurrent = index === currentStep;
        const Icon = index === 2 && isRejected ? XCircle : step.icon;
        
        return (
          <div key={step.key} className="flex items-center gap-1 flex-1">
            <div className={`
              flex items-center justify-center rounded-full w-6 h-6 transition-all duration-300
              ${isCurrent && isRejected 
                ? "bg-destructive/20 text-destructive" 
                : isActive 
                  ? "bg-primary/20 text-primary" 
                  : "bg-muted text-muted-foreground"
              }
              ${isCurrent ? "ring-2 ring-offset-1 ring-offset-background" : ""}
              ${isCurrent && isRejected ? "ring-destructive/50" : isCurrent ? "ring-primary/50" : ""}
            `}>
              <Icon className="h-3 w-3" />
            </div>
            {index < steps.length - 1 && (
              <div className={`
                flex-1 h-0.5 rounded-full transition-all duration-500
                ${index < currentStep 
                  ? "bg-primary/40" 
                  : "bg-muted"
                }
              `} />
            )}
          </div>
        );
      })}
    </div>
  );
}

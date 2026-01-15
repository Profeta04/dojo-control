import { cn } from "@/lib/utils";
import { PaymentStatus, RegistrationStatus, PAYMENT_STATUS_LABELS, REGISTRATION_STATUS_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const variants: Record<PaymentStatus, string> = {
    pendente: "bg-warning/10 text-warning border-warning/20",
    pago: "bg-success/10 text-success border-success/20",
    atrasado: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <Badge variant="outline" className={cn(variants[status])}>
      {PAYMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

interface RegistrationStatusBadgeProps {
  status: RegistrationStatus;
}

export function RegistrationStatusBadge({ status }: RegistrationStatusBadgeProps) {
  const variants: Record<RegistrationStatus, string> = {
    pendente: "bg-warning/10 text-warning border-warning/20",
    aprovado: "bg-success/10 text-success border-success/20",
    rejeitado: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <Badge variant="outline" className={cn(variants[status])}>
      {REGISTRATION_STATUS_LABELS[status]}
    </Badge>
  );
}

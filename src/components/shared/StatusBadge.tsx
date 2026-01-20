import { cn } from "@/lib/utils";
import { PaymentStatus, RegistrationStatus, PAYMENT_STATUS_LABELS, REGISTRATION_STATUS_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

interface PaymentStatusBadgeProps {
  status: PaymentStatus | string;
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const variants: Record<PaymentStatus, string> = {
    pendente: "bg-warning/10 text-warning border-warning/20",
    pago: "bg-success/10 text-success border-success/20",
    atrasado: "bg-destructive/10 text-destructive border-destructive/20",
  };

  const validStatus = status as PaymentStatus;
  const variant = variants[validStatus] || "bg-muted/10 text-muted-foreground border-muted/20";
  const label = PAYMENT_STATUS_LABELS[validStatus] || status;

  return (
    <Badge variant="outline" className={cn(variant)}>
      {label}
    </Badge>
  );
}

interface RegistrationStatusBadgeProps {
  status: RegistrationStatus | string;
}

export function RegistrationStatusBadge({ status }: RegistrationStatusBadgeProps) {
  const variants: Record<RegistrationStatus, string> = {
    pendente: "bg-warning/10 text-warning border-warning/20",
    aprovado: "bg-success/10 text-success border-success/20",
    rejeitado: "bg-destructive/10 text-destructive border-destructive/20",
  };

  const validStatus = status as RegistrationStatus;
  const variant = variants[validStatus] || "bg-muted/10 text-muted-foreground border-muted/20";
  const label = REGISTRATION_STATUS_LABELS[validStatus] || status;

  return (
    <Badge variant="outline" className={cn(variant)}>
      {label}
    </Badge>
  );
}

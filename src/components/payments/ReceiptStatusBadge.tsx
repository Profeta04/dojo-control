import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { ReceiptStatus, RECEIPT_STATUS_LABELS } from "@/lib/constants";

interface ReceiptStatusBadgeProps {
  status: ReceiptStatus | null;
  className?: string;
}

const STATUS_CONFIG: Record<ReceiptStatus, { 
  variant: "default" | "secondary" | "destructive"; 
  icon: typeof CheckCircle2;
  className: string;
}> = {
  pendente_verificacao: { 
    variant: "secondary", 
    icon: Clock,
    className: "bg-warning/10 text-warning border-warning/20"
  },
  aprovado: { 
    variant: "default", 
    icon: CheckCircle2,
    className: "bg-success/10 text-success border-success/20"
  },
  rejeitado: { 
    variant: "destructive", 
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20"
  },
};

export function ReceiptStatusBadge({ status, className = "" }: ReceiptStatusBadgeProps) {
  if (!status) return null;

  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={`gap-1 text-xs animate-fade-in ${config.className} ${className}`}
    >
      <Icon className="h-3 w-3" />
      {RECEIPT_STATUS_LABELS[status]}
    </Badge>
  );
}

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
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800"
  },
  aprovado: { 
    variant: "default", 
    icon: CheckCircle2,
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800"
  },
  rejeitado: { 
    variant: "destructive", 
    icon: XCircle,
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800"
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

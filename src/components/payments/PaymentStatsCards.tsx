import { Card, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertTriangle, CreditCard, FileImage } from "lucide-react";

interface PaymentStatsCardsProps {
  stats: {
    total: number;
    pendente: number;
    atrasado: number;
    pago: number;
    totalPendente: number;
    pendingReceipts?: number;
  };
  formatCurrency: (value: number) => string;
  variant?: "admin" | "student";
}

export function PaymentStatsCards({ stats, formatCurrency, variant = "admin" }: PaymentStatsCardsProps) {
  const cards = [
    {
      label: "Total",
      value: stats.total,
      icon: CreditCard,
      color: "text-foreground",
      bgClass: "bg-gradient-to-br from-muted/80 to-muted/30",
      delay: "0ms",
    },
    {
      label: "Pendentes",
      value: stats.pendente,
      icon: Clock,
      color: "text-muted-foreground",
      bgClass: "bg-gradient-to-br from-secondary/50 to-secondary/10",
      delay: "50ms",
    },
    {
      label: "Atrasados",
      value: stats.atrasado,
      icon: AlertTriangle,
      color: "text-destructive",
      bgClass: "bg-gradient-to-br from-destructive/10 to-destructive/5",
      delay: "100ms",
    },
    {
      label: "Pagos",
      value: stats.pago,
      icon: CheckCircle2,
      color: "text-success",
      bgClass: "bg-gradient-to-br from-success/10 to-success/5",
      delay: "150ms",
    },
  ];

  // Add pending receipts card for admin
  if (variant === "admin" && stats.pendingReceipts !== undefined && stats.pendingReceipts > 0) {
    cards.push({
      label: "Comprovantes",
      value: stats.pendingReceipts,
      icon: FileImage,
      color: "text-primary",
      bgClass: "bg-gradient-to-br from-primary/10 to-primary/5",
      delay: "200ms",
    });
  }

  return (
    <div className={`grid gap-3 ${variant === "admin" && stats.pendingReceipts ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4"} mb-6`}>
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card 
            key={card.label}
            className={`${card.bgClass} border-0 shadow-sm hover-scale animate-fade-in overflow-hidden relative`}
            style={{ animationDelay: card.delay }}
          >
            <CardHeader className="pb-2 p-4">
              <div className="flex items-center justify-between">
                <CardDescription className="flex items-center gap-1.5 text-xs font-medium">
                  {card.label}
                </CardDescription>
                <Icon className={`h-4 w-4 ${card.color} opacity-60`} />
              </div>
              <CardTitle className={`text-2xl sm:text-3xl font-bold ${card.color}`}>
                {card.value}
              </CardTitle>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}

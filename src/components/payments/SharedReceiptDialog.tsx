import { useState, useRef } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  FileImage, Upload, Loader2, CheckCircle2, Clock, AlertTriangle, Tag,
} from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PAYMENT_CATEGORY_LABELS, PaymentCategory } from "@/lib/constants";

type Payment = Tables<"payments">;

interface SharedReceiptDialogProps {
  open: boolean;
  onClose: () => void;
  file: File;
  payments: Payment[];
  userId: string;
  userName?: string;
}

export function SharedReceiptDialog({
  open,
  onClose,
  file,
  payments,
  userId,
  userName,
}: SharedReceiptDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pendingPayments = payments.filter(
    (p) => p.status === "pendente" || p.status === "atrasado"
  ).filter(
    (p) => !p.receipt_url || p.receipt_status === "rejeitado"
  );

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return format(date, "MMMM 'de' yyyy", { locale: ptBR });
  };

  const handleSubmit = async () => {
    if (!selectedId) return;
    const payment = pendingPayments.find((p) => p.id === selectedId);
    if (!payment) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Tipo de arquivo inválido", description: "Envie uma imagem (JPG, PNG, WEBP) ou PDF.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "O arquivo deve ter no máximo 5MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${payment.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from("payment-receipts").upload(fileName, file);
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("payments")
        .update({ receipt_url: fileName, receipt_status: "pendente_verificacao" })
        .eq("id", payment.id);
      if (updateError) throw updateError;

      // Notify staff
      const { data: adminSenseiRoles } = await supabase.from("user_roles").select("user_id").in("role", ["admin", "sensei"]);
      if (adminSenseiRoles && adminSenseiRoles.length > 0) {
        const notifications = adminSenseiRoles.map((role) => ({
          user_id: role.user_id,
          title: "📎 Novo Comprovante Recebido",
          message: `${userName || "Um aluno"} enviou um comprovante de pagamento referente a ${formatMonth(payment.reference_month)}.`,
          type: "payment",
          related_id: payment.id,
        }));
        await supabase.from("notifications").insert(notifications);
      }

      toast({ title: "✅ Comprovante enviado!", description: "Seu comprovante foi enviado e está aguardando verificação." });
      queryClient.invalidateQueries({ queryKey: ["student-payments", userId] });
      onClose();
    } catch (error: any) {
      toast({ title: "Erro ao enviar", description: error.message || "Não foi possível enviar o comprovante.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const statusIcon = {
    pendente: <Clock className="h-4 w-4 text-warning-foreground" />,
    atrasado: <AlertTriangle className="h-4 w-4 text-destructive" />,
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            Enviar Comprovante
          </DialogTitle>
          <DialogDescription>
            Selecione o pagamento correspondente ao comprovante recebido
          </DialogDescription>
        </DialogHeader>

        {/* File preview with thumbnail */}
        <Card className="border-primary/20 bg-primary/5 overflow-hidden">
          <CardContent className="p-3 flex items-start gap-3">
            {file.type.startsWith("image/") ? (
              <img
                src={URL.createObjectURL(file)}
                alt="Comprovante"
                className="h-20 w-20 rounded-lg object-cover border border-border/50 flex-shrink-0"
              />
            ) : (
              <div className="h-20 w-20 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileImage className="h-8 w-8 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0 py-1">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {(file.size / 1024).toFixed(0)} KB
              </p>
              <Badge variant="outline" className="mt-2 text-[10px]">
                {file.type.startsWith("image/") ? "Imagem" : "PDF"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Payments list */}
        {pendingPayments.length > 0 ? (
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {pendingPayments.map((payment) => (
              <Card
                key={payment.id}
                className={`cursor-pointer transition-all duration-200 ${
                  selectedId === payment.id
                    ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                    : "border-border hover:border-primary/40 hover:bg-muted/30"
                }`}
                onClick={() => setSelectedId(payment.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {statusIcon[payment.status as keyof typeof statusIcon]}
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {formatMonth(payment.reference_month)}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[10px] gap-0.5 px-1.5 py-0">
                            <Tag className="h-2.5 w-2.5" />
                            {PAYMENT_CATEGORY_LABELS[payment.category as PaymentCategory] || payment.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Venc. {format(parseISO(payment.due_date), "dd/MM")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatCurrency(payment.amount)}</p>
                      {selectedId === payment.id && (
                        <CheckCircle2 className="h-4 w-4 text-primary ml-auto mt-0.5" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum pagamento pendente encontrado.
            </p>
          </div>
        )}

        {/* Submit button */}
        {pendingPayments.length > 0 && (
          <Button
            className="w-full"
            disabled={!selectedId || uploading}
            onClick={handleSubmit}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Enviar Comprovante
              </>
            )}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

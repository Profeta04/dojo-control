import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDojoContext } from "@/hooks/useDojoContext";
import { toast } from "sonner";
import { CreditCard, AlertTriangle } from "lucide-react";

/**
 * Component that shows in-app toasts for payment-related events
 * even when the app is open (complementing push notifications).
 */
export function InAppPaymentNotifier() {
  const { user, canManageStudents } = useAuth();
  const { currentDojoId } = useDojoContext();
  const shownIds = useRef<Set<string>>(new Set());

  // For students: watch their own payments for status changes
  useEffect(() => {
    if (!user || canManageStudents) return;

    const channel = supabase
      .channel("payment-status-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "payments",
          filter: `student_id=eq.${user.id}`,
        },
        (payload) => {
          const newRow = payload.new as any;
          const oldRow = payload.old as any;

          if (!newRow || shownIds.current.has(newRow.id + newRow.status)) return;
          shownIds.current.add(newRow.id + newRow.status);

          // Payment became overdue
          if (newRow.status === "atrasado" && oldRow.status !== "atrasado") {
            toast.warning("Pagamento em atraso! ⚠️", {
              description: `Sua mensalidade de R$ ${Number(newRow.amount).toFixed(2)} está atrasada. Regularize para evitar bloqueio.`,
              duration: 8000,
              icon: <AlertTriangle className="h-5 w-5 text-destructive" />,
            });
          }

          // Payment approved
          if (newRow.status === "pago" && oldRow.status !== "pago") {
            toast.success("Pagamento confirmado! ✅", {
              description: `Seu pagamento de R$ ${Number(newRow.amount).toFixed(2)} foi confirmado.`,
              duration: 6000,
              icon: <CreditCard className="h-5 w-5 text-primary" />,
            });
          }

          // Receipt approved/rejected
          if (newRow.receipt_status !== oldRow.receipt_status) {
            if (newRow.receipt_status === "aprovado") {
              toast.success("Comprovante aprovado! ✅", {
                description: "Seu comprovante de pagamento foi verificado e aprovado.",
                duration: 6000,
              });
            } else if (newRow.receipt_status === "rejeitado") {
              toast.error("Comprovante rejeitado ❌", {
                description: "Seu comprovante foi rejeitado. Envie um novo comprovante.",
                duration: 8000,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, canManageStudents]);

  // For students: new payments created (new charges)
  useEffect(() => {
    if (!user || canManageStudents) return;

    const channel = supabase
      .channel("new-payments-student")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "payments",
          filter: `student_id=eq.${user.id}`,
        },
        (payload) => {
          const newRow = payload.new as any;
          if (!newRow || shownIds.current.has(newRow.id)) return;
          shownIds.current.add(newRow.id);

          toast.info("Nova cobrança gerada 💳", {
            description: `${newRow.description || "Mensalidade"} — R$ ${Number(newRow.amount).toFixed(2)} com vencimento em ${new Date(newRow.due_date).toLocaleDateString("pt-BR")}.`,
            duration: 8000,
            icon: <CreditCard className="h-5 w-5 text-primary" />,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, canManageStudents]);

  // For senseis: receipt submitted by students (filtered by dojo)
  useEffect(() => {
    if (!user || !canManageStudents || !currentDojoId) return;

    const channel = supabase
      .channel("receipt-submissions-sensei")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "payments",
        },
        async (payload) => {
          const newRow = payload.new as any;
          const oldRow = payload.old as any;

          if (
            newRow.receipt_status !== "pendente_verificacao" ||
            oldRow.receipt_status === "pendente_verificacao" ||
            shownIds.current.has(newRow.id + "receipt")
          ) return;

          // Filter by dojo: check if the student belongs to current dojo
          const { data: studentProfile } = await supabase
            .from("profiles")
            .select("dojo_id")
            .eq("user_id", newRow.student_id)
            .single();

          if (!studentProfile || studentProfile.dojo_id !== currentDojoId) return;

          shownIds.current.add(newRow.id + "receipt");
          toast.info("Novo comprovante recebido 📄", {
            description: "Um aluno enviou um comprovante de pagamento para verificação.",
            duration: 6000,
            icon: <CreditCard className="h-5 w-5 text-primary" />,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, canManageStudents, currentDojoId]);

  return null;
}

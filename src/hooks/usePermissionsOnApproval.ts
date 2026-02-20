import { useEffect, useRef } from "react";
import { useAuth } from "./useAuth";

/**
 * Solicita todas as permissões necessárias do web app
 * logo após o cadastro do usuário ser aprovado.
 *
 * Permissões solicitadas:
 * - Notificações (push notifications)
 * - Câmera (para scanner de QR Code de presença)
 */
export function usePermissionsOnApproval() {
  const { isApproved, isPending, user } = useAuth();
  const hasRequestedRef = useRef(false);
  const wasJustApprovedRef = useRef(false);

  // Detecta a transição pendente → aprovado
  useEffect(() => {
    if (isPending) {
      wasJustApprovedRef.current = true;
    }
  }, [isPending]);

  useEffect(() => {
    if (!isApproved || !user) return;
    if (hasRequestedRef.current) return;

    // Só pede permissões se acabou de ser aprovado nesta sessão,
    // OU se as permissões ainda não foram concedidas (primeira vez)
    const notifPerm = "Notification" in window ? Notification.permission : "denied";
    const alreadyGranted = notifPerm === "granted";

    // Se já tem notificações, não incomoda o usuário novamente
    if (alreadyGranted && !wasJustApprovedRef.current) return;

    hasRequestedRef.current = true;
    wasJustApprovedRef.current = false;

    requestAllPermissions();
  }, [isApproved, user]);
}

async function requestAllPermissions() {
  // Pequeno delay para o usuário ver a tela principal antes dos diálogos
  await new Promise((r) => setTimeout(r, 1500));

  // 1. Notificações push
  if ("Notification" in window && Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch {
      // silencioso
    }
  }

  // 2. Câmera (apenas pré-aquece a permissão; não mantém o stream)
  if (
    typeof navigator !== "undefined" &&
    navigator.mediaDevices &&
    typeof navigator.permissions !== "undefined"
  ) {
    try {
      const camStatus = await navigator.permissions.query({
        name: "camera" as PermissionName,
      });
      if (camStatus.state === "prompt") {
        // Solicita acesso e encerra imediatamente para liberar hardware
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((t) => t.stop());
      }
    } catch {
      // silencioso — usuário pode recusar
    }
  }
}

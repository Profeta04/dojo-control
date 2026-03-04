import { Component, ErrorInfo, ReactNode } from "react";
import { DojoLoadingSpinner } from "@/components/shared/DojoLoadingSpinner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  inline?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

const MAX_RETRIES = 5;
const RETRY_DELAYS = [500, 1000, 2000, 3000, 4000];
const RELOAD_KEY = "eb-reload-ts";
const RELOAD_COOLDOWN = 10_000;

function isChunkError(error: Error): boolean {
  const msg = (error?.message || "").toLowerCase();
  return (
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("loading chunk") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("loading css chunk") ||
    msg.includes("unable to preload css")
  );
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error.message);

    // Chunk errors → silent reload with cooldown (no admin notification)
    if (isChunkError(error)) {
      const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) || "0");
      if (Date.now() - lastReload > RELOAD_COOLDOWN) {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
        window.location.reload();
      }
      return;
    }

    const { retryCount } = this.state;

    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAYS[retryCount] ?? 4000;
      this.retryTimer = setTimeout(() => {
        this.setState((prev) => ({
          hasError: false,
          error: null,
          retryCount: prev.retryCount + 1,
        }));
      }, delay);
    } else {
      this.reportErrorAndRedirect(error, errorInfo);
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  private async reportErrorAndRedirect(error: Error, errorInfo: ErrorInfo) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      if (userId) {
        const { data: admins } = await supabase
          .from("user_roles")
          .select("user_id")
          .in("role", ["admin", "dono"]);

        if (admins && admins.length > 0) {
          const notifications = admins.map((a) => ({
            user_id: a.user_id,
            title: "⚠️ Erro automático no app",
            message: `Erro: ${error.message?.slice(0, 200) || "desconhecido"} | Usuário: ${user?.email || userId} | Stack: ${errorInfo.componentStack?.slice(0, 300) || "N/A"}`,
            type: "bug_report",
          }));

          await supabase.from("notifications").insert(notifications);
        }
      }
    } catch (e) {
      console.error("Failed to report error:", e);
    }

    window.location.href = "/";
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return this.props.inline ? (
        <div className="flex items-center justify-center p-6">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <DojoLoadingSpinner />
        </div>
      );
    }

    return this.props.children;
  }
}

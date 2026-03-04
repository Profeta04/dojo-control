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
    console.error("ErrorBoundary caught:", error, errorInfo);

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
      // All retries exhausted — report error and redirect
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
        // Find all admins/donos to notify
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

    // Redirect to home
    window.location.href = "/";
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      // Show loading spinner while auto-retrying
      if (this.state.retryCount < MAX_RETRIES) {
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

      // Fallback while redirecting (should be brief)
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <DojoLoadingSpinner />
        </div>
      );
    }

    return this.props.children;
  }
}

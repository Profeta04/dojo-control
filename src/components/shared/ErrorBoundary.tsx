import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** When true, renders inline (no min-h-screen) for use inside dialogs/tabs */
  inline?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const isChunkError =
        this.state.error?.message?.includes("Failed to fetch") ||
        this.state.error?.message?.includes("Loading chunk") ||
        this.state.error?.message?.includes("dynamically imported module") ||
        this.state.error?.message?.includes("error loading");

      if (this.props.inline) {
        return (
          <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground">
              {isChunkError
                ? "Erro de conexão. Verifique sua internet."
                : "Algo deu errado ao carregar este conteúdo."}
            </p>
            <Button size="sm" variant="outline" onClick={this.handleReset}>
              Tentar novamente
            </Button>
          </div>
        );
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">
              Algo deu errado
            </h2>
            <p className="text-sm text-muted-foreground">
              {isChunkError
                ? "Não foi possível carregar a página. Verifique sua conexão e tente novamente."
                : "Ocorreu um erro inesperado. Tente recarregar a página."}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={this.handleReset}>
                Tentar novamente
              </Button>
              <Button onClick={() => window.location.reload()}>
                Recarregar página
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

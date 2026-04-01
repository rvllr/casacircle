import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  showHomeButton?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const {
      fallbackTitle = "Une erreur est survenue",
      fallbackMessage = "La page a rencontré un problème inattendu. Veuillez réessayer.",
      showHomeButton = true,
    } = this.props;

    return (
      <div className="flex items-center justify-center min-h-[300px] p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">{fallbackTitle}</h2>
          <p className="text-sm text-muted-foreground">{fallbackMessage}</p>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="outline" size="sm" onClick={this.handleReset}>
              Réessayer
            </Button>
            {showHomeButton && (
              <Button size="sm" onClick={this.handleGoHome}>
                Retour à l'accueil
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;

import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logError } from "@/lib/errors";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logError("app", error.message, { stack: info.componentStack?.slice(0, 1500) }, "critical");
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">Something went wrong</h1>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            We hit an unexpected problem and our team has been notified. Reloading usually fixes it.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => window.location.reload()} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Reload page
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = "/dashboard")} className="gap-2">
            <Home className="h-4 w-4" /> Go to dashboard
          </Button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = this.state.error?.message || "An unexpected error occurred.";
      let parsedError = null;
      
      try {
        parsedError = JSON.parse(errorMessage);
        if (parsedError.error) {
          errorMessage = parsedError.error;
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-base)] p-4">
          <div className="max-w-md w-full bg-[var(--color-bg-card)] border border-[var(--color-border-default)] rounded-2xl p-8 text-center shadow-xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-display text-[var(--color-text-primary)] mb-4">
              Oops! Something went wrong.
            </h1>
            <p className="text-[var(--color-text-secondary)] mb-6 text-sm">
              {errorMessage}
            </p>
            {parsedError && parsedError.operationType && (
              <div className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-elevated)] p-4 rounded-lg mb-6 text-left overflow-auto">
                <p><strong>Operation:</strong> {parsedError.operationType}</p>
                <p><strong>Path:</strong> {parsedError.path}</p>
                <p><strong>User ID:</strong> {parsedError.authInfo?.userId || 'Not logged in'}</p>
              </div>
            )}
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-full font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
            >
              Return Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

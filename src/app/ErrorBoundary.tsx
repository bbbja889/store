import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** Shows a calm fallback instead of a white screen. Never renders user identifiers. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('VICZO crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-void p-6 text-center">
        <div className="max-w-md">
          <p className="hud text-danger">Signal interrupted</p>
          <h1 className="display mt-4 text-4xl">Something broke.</h1>
          <p className="mt-3 text-sm text-ink-2">The page hit an unexpected error. Reloading usually fixes it.</p>
          <button onClick={() => (window.location.href = '/')} className="mt-6 rounded-full bg-ember px-5 py-2.5 text-sm font-medium text-void">
            Back to the Core
          </button>
        </div>
      </div>
    );
  }
}

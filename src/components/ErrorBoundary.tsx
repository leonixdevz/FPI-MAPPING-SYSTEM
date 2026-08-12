import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Last-resort error boundary. Catches render errors in the tree below
 * and shows a recoverable message instead of a blank screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[sms] error boundary caught:', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center p-6">
          <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <h1 className="text-lg font-semibold text-red-900">Something went wrong</h1>
            <p className="mt-2 text-sm text-red-800">{this.state.error.message}</p>
            <button
              type="button"
              onClick={() => {
                this.setState({ error: null });
              }}
              className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

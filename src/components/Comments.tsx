import { Component, type ErrorInfo, type ReactNode } from "react";
import { withConvexProvider } from "../lib/convex.tsx";
import { CommentAgentChat } from "./CommentAgentChat";
import { CommentForm, useEnsureUser } from "./CommentForm";
import { CommentList } from "./CommentList";

class CommentAgentChatErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; resetKey: number }
> {
  state = { hasError: false, resetKey: 0 };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("CommentAgentChat error:", error, info.componentStack);
  }

  handleRetry = (): void => {
    this.setState((state) => ({
      hasError: false,
      resetKey: state.resetKey + 1,
    }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="mb-10 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p>
            Comment coach is temporarily unavailable.
            {import.meta.env.DEV && (
              <>
                {" "}
                If this persists locally, restart{" "}
                <code className="rounded bg-amber-100 px-1">pnpm dev</code> so
                Convex syncs the latest functions.
              </>
            )}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-3 rounded-md bg-amber-800 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-900 focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 focus:outline-none"
          >
            Try again
          </button>
        </div>
      );
    }
    return <div key={this.state.resetKey}>{this.props.children}</div>;
  }
}

class CommentFormErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; resetKey: number }
> {
  state = { hasError: false, resetKey: 0 };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("CommentForm error:", error, info.componentStack);
  }

  handleRetry = (): void => {
    this.setState((state) => ({
      hasError: false,
      resetKey: state.resetKey + 1,
    }));
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p>
            Comment form is temporarily unavailable. Comments below may still
            load. Please try refreshing the page.
            {import.meta.env.DEV && (
              <>
                {" "}
                If this persists locally, restart{" "}
                <code className="rounded bg-amber-100 px-1">pnpm dev</code> so
                Convex syncs the latest functions.
              </>
            )}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-3 rounded-md bg-amber-800 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-900 focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 focus:outline-none"
          >
            Try again
          </button>
        </div>
      );
    }
    return <div key={this.state.resetKey}>{this.props.children}</div>;
  }
}

export default withConvexProvider(function Comments() {
  useEnsureUser();

  return (
    <>
      <CommentAgentChatErrorBoundary>
        <CommentAgentChat />
      </CommentAgentChatErrorBoundary>
      <CommentFormErrorBoundary>
        <CommentForm />
      </CommentFormErrorBoundary>
      <CommentList />
    </>
  );
});

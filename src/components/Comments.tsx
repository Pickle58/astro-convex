import { Component, type ErrorInfo, type ReactNode } from "react";
import { withConvexProvider } from "../lib/convex.tsx";
import { CommentForm, useEnsureUser } from "./CommentForm.tsx";
import { CommentList } from "./CommentList.tsx";

class CommentFormErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("CommentForm error:", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <p className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Comment form is temporarily unavailable. Comments below may still load.
          If this persists, restart{" "}
          <code className="rounded bg-amber-100 px-1">pnpm dev</code> so Convex
          syncs the latest functions.
        </p>
      );
    }
    return this.props.children;
  }
}

export default withConvexProvider(function Comments() {
  useEnsureUser();

  return (
    <>
      <CommentFormErrorBoundary>
        <CommentForm />
      </CommentFormErrorBoundary>
      <CommentList />
    </>
  );
});

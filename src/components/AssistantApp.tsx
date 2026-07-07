import { Authenticated, Unauthenticated, useConvexAuth } from "convex/react";
import { useEffect } from "react";
import { withConvexProvider } from "../lib/convex.tsx";
import { useAgentThreads } from "../hooks/useAgentThreads";
import { useEnsureUser } from "./CommentForm";
import { AgentChatErrorBoundary } from "./agent/AgentChatErrorBoundary";
import { AgentChatPanel } from "./agent/AgentChatPanel";
import { ThreadSidebar } from "./agent/ThreadSidebar";

function AssistantAppInner() {
  useEnsureUser();
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const {
    threadId,
    setThreadId,
    isCreatingThread,
    isValidatingThreadAccess,
    canUseThread,
    error,
    startNewThread,
    clearThread,
  } = useAgentThreads({ context: "assistant", storageKey: "assistantThreadId" });

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      clearThread();
    }
  }, [isAuthenticated, isAuthLoading, clearThread]);

  return (
    <AgentChatErrorBoundary label="Assistant">
      <Unauthenticated>
        <p className="rounded-lg border border-dashed border-border bg-surface-muted px-4 py-8 text-center text-text-muted">
          Sign in to use the assistant.
        </p>
      </Unauthenticated>

      <Authenticated>
        {isAuthLoading && (
          <p className="text-sm text-text-muted">Checking sign-in…</p>
        )}
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <div className="flex min-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-xl border border-border bg-surface md:flex-row">
          <ThreadSidebar
            context="assistant"
            activeThreadId={threadId}
            onSelectThread={setThreadId}
            onNewChat={() => void startNewThread()}
            isCreating={isCreatingThread}
          />
          <main className="flex min-h-0 flex-1 flex-col p-4">
            {isCreatingThread && threadId === null && (
              <p className="text-sm text-text-muted">Starting chat…</p>
            )}
            {!threadId && !isCreatingThread && !isValidatingThreadAccess && (
              <p className="text-sm text-text-muted">
                Select a conversation or start a new chat.
              </p>
            )}
            {isValidatingThreadAccess && (
              <p className="text-sm text-text-muted">Loading conversation…</p>
            )}
            {canUseThread && threadId && (
              <AgentChatPanel
                key={threadId}
                threadId={threadId}
                context="assistant"
                emptyStateMessage="Ask anything. This assistant has no access to the comment board."
                inputPlaceholder="Ask the assistant…"
                messagesClassName="min-h-[20rem] max-h-[calc(100vh-14rem)]"
                className="flex h-full min-h-0 flex-col gap-3"
              />
            )}
          </main>
        </div>
      </Authenticated>
    </AgentChatErrorBoundary>
  );
}

export default withConvexProvider(AssistantAppInner);

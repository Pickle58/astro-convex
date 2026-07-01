import { Authenticated, Unauthenticated, useConvexAuth } from "convex/react";
import { useEffect } from "react";
import { useAgentThreads } from "../hooks/useAgentThreads";
import { AgentChatPanel } from "./agent/AgentChatPanel";

export function CommentAgentChat() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const { threadId, isCreatingThread, error, startNewThread, clearThread } =
    useAgentThreads({ context: "coach", storageKey: "commentCoachThreadId" });

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      clearThread();
    }
  }, [isAuthenticated, isAuthLoading, clearThread]);

  return (
    <section className="mb-10 rounded-xl border border-indigo-100 bg-indigo-50/40 p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Comment coach</h3>
          <p className="mt-1 text-sm text-gray-600">
            Multi-step agent with tools, persistent threads, and live streaming replies.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void startNewThread()}
          disabled={isCreatingThread || !isAuthenticated}
          className="shrink-0 rounded-md border border-indigo-200 bg-white px-3 py-1.5 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50 disabled:opacity-60"
        >
          New chat
        </button>
      </div>

      <Unauthenticated>
        <p className="text-sm text-gray-600">Sign in to chat with the comment coach.</p>
      </Unauthenticated>

      <Authenticated>
        {isAuthLoading && (
          <p className="text-sm text-gray-500">Checking sign-in…</p>
        )}
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {isCreatingThread && threadId === null && (
          <p className="text-sm text-gray-500">Starting chat…</p>
        )}
        {threadId && (
          <AgentChatPanel
            key={threadId}
            threadId={threadId}
            context="coach"
            emptyStateMessage="Ask for help writing a comment, getting board context, or polishing a draft. The coach can use tools to read recent comments and improve text."
            inputPlaceholder="Ask the comment coach…"
          />
        )}
      </Authenticated>
    </section>
  );
}

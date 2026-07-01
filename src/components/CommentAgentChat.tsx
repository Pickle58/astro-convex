import {
  optimisticallySendMessage,
  useUIMessages,
  type UIMessage,
} from "@convex-dev/agent/react";
import { Authenticated, Unauthenticated, useConvexAuth, useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { useCommentCoachThread } from "../hooks/useCommentCoachThread";
import { api } from "../../convex/_generated/api";

function AgentMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const isStreaming = !isUser && message.status === "streaming";
  const displayText = message.text || "…";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
          isUser
            ? "bg-indigo-600 text-white"
            : "border border-gray-200 bg-gray-50 text-gray-800"
        }`}
      >
        {displayText}
        {isStreaming && message.text && (
          <span className="ml-0.5 inline-block animate-pulse text-indigo-400">▍</span>
        )}
      </div>
    </div>
  );
}

function AgentChatPanel({ threadId }: { threadId: string }) {
  const { results, status, loadMore } = useUIMessages(
    api.chat.messages.listThreadMessages,
    { threadId },
    { initialNumItems: 20, stream: true },
  );
  const sendMessage = useMutation(api.chat.messages.sendMessage).withOptimisticUpdate(
    optimisticallySendMessage(api.chat.messages.listThreadMessages),
  );
  const [prompt, setPrompt] = useState("");
  const [sendError, setSendError] = useState<string>();

  const handleSend = () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      return;
    }

    setSendError(undefined);
    setPrompt("");

    void sendMessage({ threadId, prompt: trimmed }).catch((error) => {
      console.error(error);
      setPrompt(trimmed);
      setSendError(
        error instanceof Error ? error.message : "Could not send message.",
      );
    });
  };

  const canSend = prompt.trim().length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4">
        {status === "LoadingFirstPage" && (
          <p className="text-sm text-gray-500">Loading messages…</p>
        )}
        {status !== "LoadingFirstPage" && (results?.length ?? 0) === 0 && (
          <p className="text-sm text-gray-500">
            Ask for help writing a comment, getting board context, or polishing a
            draft. The coach can use tools to read recent comments and improve
            text.
          </p>
        )}
        {results?.map((message) => (
          <AgentMessage key={message.key} message={message} />
        ))}
      </div>

      {status === "CanLoadMore" && (
        <button
          type="button"
          onClick={() => loadMore(20)}
          className="self-start text-sm text-indigo-600 hover:text-indigo-800"
        >
          Load older messages
        </button>
      )}

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          handleSend();
        }}
      >
        <input
          value={prompt}
          onChange={(event) => {
            setPrompt(event.target.value);
            if (sendError) {
              setSendError(undefined);
            }
          }}
          placeholder="Ask the comment coach…"
          className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!canSend}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Send
        </button>
      </form>

      {sendError && <p className="text-sm text-red-600">{sendError}</p>}
    </div>
  );
}

export function CommentAgentChat() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const { threadId, isCreatingThread, error, startNewThread, clearThread } =
    useCommentCoachThread();

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
        {threadId && <AgentChatPanel key={threadId} threadId={threadId} />}
      </Authenticated>
    </section>
  );
}

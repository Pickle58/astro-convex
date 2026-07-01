import {
  optimisticallySendMessage,
  useUIMessages,
} from "@convex-dev/agent/react";
import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { AgentMessage } from "./AgentMessage";
import type { ThreadContext } from "./types";

export type AgentChatPanelProps = {
  threadId: string;
  context: ThreadContext;
  emptyStateMessage: string;
  inputPlaceholder: string;
  className?: string;
  messagesClassName?: string;
};

export function AgentChatPanel({
  threadId,
  context,
  emptyStateMessage,
  inputPlaceholder,
  className,
  messagesClassName = "max-h-80",
}: AgentChatPanelProps) {
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

    void sendMessage({ threadId, prompt: trimmed, context }).catch((error) => {
      console.error(error);
      setPrompt(trimmed);
      setSendError(
        error instanceof Error ? error.message : "Could not send message.",
      );
    });
  };

  const canSend = prompt.trim().length > 0;

  return (
    <div className={className ?? "flex flex-col gap-3"}>
      <div
        className={`space-y-3 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 ${messagesClassName}`}
      >
        {status === "LoadingFirstPage" && (
          <p className="text-sm text-gray-500">Loading messages…</p>
        )}
        {status !== "LoadingFirstPage" && (results?.length ?? 0) === 0 && (
          <p className="text-sm text-gray-500">{emptyStateMessage}</p>
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
          placeholder={inputPlaceholder}
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

import {
  optimisticallySendMessage,
  useUIMessages,
} from "@convex-dev/agent/react";
import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { accentButtonClass, inputClass, linkClass } from "../../lib/ui";
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
        className={`space-y-3 overflow-y-auto rounded-lg border border-border bg-surface p-4 ${messagesClassName}`}
      >
        {status === "LoadingFirstPage" && (
          <p className="text-sm text-text-muted">Loading messages…</p>
        )}
        {status !== "LoadingFirstPage" && (results?.length ?? 0) === 0 && (
          <p className="text-sm text-text-muted">{emptyStateMessage}</p>
        )}
        {results?.map((message) => (
          <AgentMessage key={message.key} message={message} />
        ))}
      </div>

      {status === "CanLoadMore" && (
        <button
          type="button"
          onClick={() => loadMore(20)}
          className={`self-start text-sm ${linkClass}`}
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
          className={`min-w-0 flex-1 ${inputClass} text-sm`}
        />
        <button
          type="submit"
          disabled={!canSend}
          className={accentButtonClass}
        >
          Send
        </button>
      </form>

      {sendError && <p className="text-sm text-red-600">{sendError}</p>}
    </div>
  );
}

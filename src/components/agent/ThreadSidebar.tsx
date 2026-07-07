import { usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { accentButtonClass, linkClass } from "../../lib/ui";
import type { ThreadContext } from "./types";

type ThreadSidebarProps = {
  context: ThreadContext;
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onNewChat: () => void;
  isCreating: boolean;
};

export function ThreadSidebar({
  context,
  activeThreadId,
  onSelectThread,
  onNewChat,
  isCreating,
}: ThreadSidebarProps) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.chat.threads.listThreads,
    { context },
    { initialNumItems: 20 },
  );

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-border bg-surface md:w-64 md:border-r md:border-b-0">
      <div className="border-b border-border p-3">
        <button
          type="button"
          onClick={onNewChat}
          disabled={isCreating}
          className={`w-full ${accentButtonClass}`}
        >
          New chat
        </button>
      </div>
      <div className="max-h-48 flex-1 overflow-y-auto p-2 md:max-h-none">
        {results.length === 0 && (
          <p className="px-2 py-3 text-sm text-text-muted">No conversations yet.</p>
        )}
        <ul className="space-y-1">
          {results.map((thread) => {
            const id = thread._id as string;
            const isActive = id === activeThreadId;
            const title = (thread.title as string | undefined) ?? "Untitled";
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onSelectThread(id)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    isActive
                      ? "bg-primary-muted font-medium text-primary"
                      : "text-text hover:bg-surface-muted"
                  }`}
                >
                  {title}
                </button>
              </li>
            );
          })}
        </ul>
        {status === "CanLoadMore" && (
          <button
            type="button"
            onClick={() => loadMore(20)}
            className={`mt-2 w-full px-3 py-2 text-left text-sm ${linkClass}`}
          >
            Load more
          </button>
        )}
      </div>
    </aside>
  );
}

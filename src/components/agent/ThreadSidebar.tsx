import { usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
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
    <aside className="flex w-full shrink-0 flex-col border-b border-gray-200 bg-white md:w-64 md:border-r md:border-b-0">
      <div className="border-b border-gray-200 p-3">
        <button
          type="button"
          onClick={onNewChat}
          disabled={isCreating}
          className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          New chat
        </button>
      </div>
      <div className="max-h-48 flex-1 overflow-y-auto p-2 md:max-h-none">
        {results.length === 0 && (
          <p className="px-2 py-3 text-sm text-gray-500">No conversations yet.</p>
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
                      ? "bg-indigo-50 font-medium text-indigo-900"
                      : "text-gray-700 hover:bg-gray-50"
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
            className="mt-2 w-full px-3 py-2 text-left text-sm text-indigo-600 hover:text-indigo-800"
          >
            Load more
          </button>
        )}
      </div>
    </aside>
  );
}

import { usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { secondaryButtonClass } from "../lib/ui";
import type { Comment } from "../lib/convex-types";

const PAGE_SIZE = 10;

type PaginationStatus =
  | "LoadingFirstPage"
  | "CanLoadMore"
  | "LoadingMore"
  | "Exhausted";

type CommentListViewProps = {
  totalCount: number | undefined;
  results: Comment[];
  status: PaginationStatus;
  loadMore: (numItems: number) => void;
};

function CommentListView({
  totalCount,
  results,
  status,
  loadMore,
}: CommentListViewProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (status === "LoadingFirstPage") {
    return <p className="py-4 text-center text-text-muted">Loading comments...</p>;
  }

  if (results.length === 0) {
    return <p className="py-4 text-center text-text-muted">No comments yet.</p>;
  }

  const visibleResults = results.slice(0, visibleCount);
  const hasMoreOnServer = status === "CanLoadMore";
  const hasMoreLocally = results.length > visibleCount;
  const hasMoreByCount = totalCount !== undefined && visibleCount < totalCount;
  const showLoadMore = hasMoreLocally || hasMoreOnServer || hasMoreByCount;

  const handleLoadMore = () => {
    const nextVisibleCount = visibleCount + PAGE_SIZE;
    setVisibleCount(nextVisibleCount);
    if (nextVisibleCount > results.length && hasMoreOnServer) {
      loadMore(PAGE_SIZE);
    }
  };

  return (
    <div className="space-y-6">
      {totalCount !== undefined && totalCount > PAGE_SIZE && (
        <p className="text-center text-sm text-text-muted">
          Showing {visibleResults.length} of {totalCount} comments
        </p>
      )}

      {visibleResults.map((comment: Comment) => (
        <article
          key={comment._id}
          className="rounded-lg border border-border bg-surface-muted p-4 shadow-sm"
        >
          <header className="mb-2 flex items-center justify-between">
            <strong className="font-medium text-text">{comment.author}</strong>
            <span className="text-sm text-text-muted">
              {new Date(comment._creationTime).toLocaleDateString()}
            </span>
          </header>
          <main className="leading-relaxed text-text">
            <p className="whitespace-pre-line">{comment.content}</p>
          </main>
        </article>
      ))}

      {showLoadMore && (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={status === "LoadingMore"}
          className={`w-full ${secondaryButtonClass}`}
        >
          {status === "LoadingMore"
            ? "Loading more comments..."
            : "Load more comments"}
        </button>
      )}
    </div>
  );
}

function GlobalCommentList() {
  const totalCount = useQuery(api.comments.count);
  const { results, status, loadMore } = usePaginatedQuery(
    api.comments.list,
    {},
    { initialNumItems: PAGE_SIZE },
  );

  return (
    <CommentListView
      totalCount={totalCount}
      results={results}
      status={status}
      loadMore={loadMore}
    />
  );
}

function PostCommentList({ postId }: { postId: Id<"posts"> }) {
  const totalCount = useQuery(api.comments.countByPost, { postId });
  const { results, status, loadMore } = usePaginatedQuery(
    api.comments.listByPost,
    { postId },
    { initialNumItems: PAGE_SIZE },
  );

  return (
    <CommentListView
      totalCount={totalCount}
      results={results}
      status={status}
      loadMore={loadMore}
    />
  );
}

export function CommentList({ postId }: { postId?: Id<"posts"> }) {
  return postId ? (
    <PostCommentList postId={postId} />
  ) : (
    <GlobalCommentList />
  );
}

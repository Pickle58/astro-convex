import { usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";

const PAGE_SIZE = 10;

export function CommentList() {
  const totalCount = useQuery(api.comments.count);
  const { results, status, loadMore } = usePaginatedQuery(
    api.comments.list,
    {},
    { initialNumItems: PAGE_SIZE },
  );
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (status === "LoadingFirstPage") {
    return <p className="py-4 text-center text-gray-500">Loading comments...</p>;
  }

  if (results.length === 0) {
    return <p className="py-4 text-center text-gray-500">No comments found.</p>;
  }

  const visibleResults = results.slice(0, visibleCount);
  const hasMoreOnServer = status === "CanLoadMore";
  const hasMoreLocally = results.length > visibleCount;
  const hasMoreByCount =
    totalCount !== undefined && visibleCount < totalCount;
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
        <p className="text-center text-sm text-gray-500">
          Showing {visibleResults.length} of {totalCount} comments
        </p>
      )}

      {visibleResults.map((comment) => (
        <article
          key={comment._id}
          className="rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm"
        >
          <header className="mb-2 flex items-center justify-between">
            <strong className="font-medium text-gray-900">
              {comment.author}
            </strong>
            <span className="text-sm text-gray-500">
              {new Date(comment._creationTime).toLocaleDateString()}
            </span>
          </header>
          <main className="leading-relaxed text-gray-700">
            <p className="whitespace-pre-line">{comment.content}</p>
          </main>
        </article>
      ))}

      {showLoadMore && (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={status === "LoadingMore"}
          className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "LoadingMore"
            ? "Loading more comments..."
            : "Load more comments"}
        </button>
      )}
    </div>
  );
}

import { useAction, useMutation, useQuery } from "convex/react";
import { Authenticated, Unauthenticated, useConvexAuth } from "convex/react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";

function getUtcDayStart(timestamp: number): number {
  const date = new Date(timestamp);
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
}

export function CommentForm() {
  const createComment = useMutation(api.comments.create);
  const suggestComment = useAction(api.ai.suggestComment);
  const { isAuthenticated } = useConvexAuth();
  const dayStart = useMemo(() => getUtcDayStart(Date.now()), []);
  const quota = useQuery(
    api.users.suggestionQuota,
    isAuthenticated ? { dayStart } : "skip",
  );
  const [displayName, setDisplayName] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string>();
  const [isSuggesting, setIsSuggesting] = useState(false);

  const suggestDisabled =
    !content.trim() ||
    isSuggesting ||
    (quota !== undefined && quota.remaining === 0);

  const handleSuggest = async () => {
    const draft = content.trim();
    if (!draft || (quota !== undefined && quota.remaining === 0)) {
      return;
    }

    setError(undefined);
    setIsSuggesting(true);
    try {
      const suggestion = await suggestComment({ draft });
      setContent(suggestion);
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error
          ? error.message
          : "Could not generate a suggestion. Please try again.",
      );
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!displayName.trim()) {
      setError("Enter your name before posting");
      return;
    }
    if (!content.trim()) {
      setError("Comment content is required");
      return;
    }

    setError(undefined);
    try {
      await createComment({
        displayName: displayName.trim(),
        content: content.trim(),
      });
      setDisplayName("");
      setContent("");
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error ? error.message : "Submission failed, try again.",
      );
    }
  };

  return (
    <>
      <Unauthenticated>
        <p className="mb-8 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-gray-600">
          Sign in to post a comment.
        </p>
      </Unauthenticated>
      <Authenticated>
        <form onSubmit={handleSubmit} className="mb-8 space-y-4">
          <input
            type="text"
            name="comment-display-name"
            autoComplete="off"
            placeholder="Please enter your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <textarea
            placeholder="Leave a comment..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px] w-full resize-y rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          {quota && (
            <p className="text-xs text-gray-500">
              {quota.remaining > 0
                ? `${quota.remaining} AI suggestion${quota.remaining === 1 ? "" : "s"} remaining today`
                : "Daily AI suggestion limit reached. Try again tomorrow."}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void handleSuggest()}
              disabled={suggestDisabled}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {isSuggesting ? "Suggesting…" : "Suggest edit"}
            </button>
            <button
              type="submit"
              disabled={isSuggesting}
              className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              Post Comment
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </form>
      </Authenticated>
    </>
  );
}

export function useEnsureUser() {
  const ensureUser = useMutation(api.users.ensure);
  const { isAuthenticated } = useConvexAuth();

  useEffect(() => {
    if (isAuthenticated) {
      void ensureUser();
    }
  }, [isAuthenticated, ensureUser]);
}

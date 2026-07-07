import { useAction, useMutation, useQuery } from "convex/react";
import { Authenticated, Unauthenticated, useConvexAuth } from "convex/react";
import { type FormEvent, useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { getUtcDayStart } from "../../convex/lib/utcDayStart";
import {
  accentButtonClass,
  inputClass,
  linkClass,
  panelHighlightClass,
  secondaryButtonClass,
} from "../lib/ui";

export function CommentForm({ postId }: { postId?: Id<"posts"> }) {
  const createComment = useMutation(api.comments.create);
  const suggestComment = useAction(api.ai.suggestComment);
  const { isAuthenticated } = useConvexAuth();
  const dayStart = getUtcDayStart(Date.now());
  const quota = useQuery(
    api.users.suggestionQuota,
    isAuthenticated ? { dayStart } : "skip",
  );
  const [displayName, setDisplayName] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string>();
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [pendingSuggestion, setPendingSuggestion] = useState<string>();
  const [revertDraft, setRevertDraft] = useState<string>();

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
    setPendingSuggestion(undefined);
    setRevertDraft(undefined);
    setIsSuggesting(true);
    try {
      const suggestion = await suggestComment({ draft });
      setPendingSuggestion(suggestion);
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

  const handleUseSuggestion = () => {
    if (!pendingSuggestion) {
      return;
    }
    setRevertDraft(content);
    setContent(pendingSuggestion);
    setPendingSuggestion(undefined);
  };

  const handleDismissSuggestion = () => {
    setPendingSuggestion(undefined);
  };

  const handleRevert = () => {
    setContent(revertDraft);
    setRevertDraft(undefined);
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
        postId,
      });
      setDisplayName("");
      setContent("");
      setPendingSuggestion(undefined);
      setRevertDraft(undefined);
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
        <p className="mb-8 rounded-lg border border-dashed border-border bg-surface-muted px-4 py-6 text-center text-text-muted">
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
            className={inputClass}
          />
          <textarea
            placeholder="Leave a comment..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={`min-h-[100px] resize-y ${inputClass}`}
          />
          {pendingSuggestion && (
            <div className={`${panelHighlightClass} text-sm !p-3`}>
              <p className="mb-2 font-medium text-text">Suggested edit</p>
              <p className="mb-3 whitespace-pre-wrap text-text">
                {pendingSuggestion}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleUseSuggestion}
                  className={`px-3 py-1.5 text-sm ${accentButtonClass}`}
                >
                  Use suggestion
                </button>
                <button
                  type="button"
                  onClick={handleDismissSuggestion}
                  className={`px-3 py-1.5 text-sm ${secondaryButtonClass}`}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
          {revertDraft && !pendingSuggestion && (
            <div className="flex">
              <button
                type="button"
                onClick={handleRevert}
                className={`text-sm ${linkClass}`}
              >
                Revert to original draft
              </button>
            </div>
          )}
          {quota && (
            <p className="text-xs text-text-muted">
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
              className={`w-full sm:w-auto ${secondaryButtonClass}`}
            >
              {isSuggesting ? "Suggesting…" : "Suggest edit"}
            </button>
            <button
              type="submit"
              disabled={isSuggesting}
              className={`w-full sm:w-auto ${accentButtonClass}`}
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

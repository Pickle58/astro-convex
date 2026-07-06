import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { isUsableDisplayName } from "./displayName";

export type CommentDoc = Doc<"comments">;

export function normalizeCommentAuthor(comment: CommentDoc): CommentDoc {
  return {
    ...comment,
    author: isUsableDisplayName(comment.author) ? comment.author : "Unknown",
  };
}

export function normalizeCommentPage(page: CommentDoc[]): CommentDoc[] {
  return page.map(normalizeCommentAuthor);
}

/** Count comments using indexed pagination (avoids loading all rows at once). */
export async function countComments(ctx: QueryCtx): Promise<number> {
  let total = 0;
  let cursor: string | null = null;

  while (true) {
    const { page, isDone, continueCursor } = await ctx.db
      .query("comments")
      .order("desc")
      .paginate({ numItems: 100, cursor });

    total += page.length;

    if (isDone) {
      return total;
    }
    cursor = continueCursor;
  }
}

/** Count comments for a single post using the by_post index. */
export async function countCommentsByPost(
  ctx: QueryCtx,
  postId: Id<"posts">,
): Promise<number> {
  let total = 0;
  let cursor: string | null = null;

  while (true) {
    const { page, isDone, continueCursor } = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", postId))
      .order("desc")
      .paginate({ numItems: 100, cursor });

    total += page.length;

    if (isDone) {
      return total;
    }
    cursor = continueCursor;
  }
}

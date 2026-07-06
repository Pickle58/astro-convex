import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { isUsableDisplayName } from "./displayName";
import type { Post } from "./postValidators";

export const MAX_TITLE_LENGTH = 200;
export const MAX_EXCERPT_LENGTH = 300;
export const MAX_DISPLAY_NAME_LENGTH = 50;

export type PostDoc = Doc<"posts">;

/** Validate and normalize a post title. Throws on invalid input. */
export function normalizeTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error("Title is required");
  }
  if (trimmed.length > MAX_TITLE_LENGTH) {
    throw new Error(`Title must be ${MAX_TITLE_LENGTH} characters or less`);
  }
  return trimmed;
}

/** Validate and normalize post body markdown. Throws on empty input. */
export function normalizeBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("Post content is required");
  }
  return trimmed;
}

/** Validate and normalize a display name, mirroring the comment flow. */
export function normalizePostDisplayName(displayName: string): string {
  const trimmed = displayName.trim();
  if (!isUsableDisplayName(trimmed)) {
    throw new Error("Please enter your name");
  }
  if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
    throw new Error(
      `Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or less`,
    );
  }
  return trimmed;
}

export function normalizeExcerpt(excerpt: string | undefined): string | undefined {
  if (excerpt === undefined) {
    return undefined;
  }
  const trimmed = excerpt.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.slice(0, MAX_EXCERPT_LENGTH);
}

/** Throw unless the given user owns the post. */
export function assertAuthor(post: PostDoc, userId: Id<"users">): void {
  if (post.authorId !== userId) {
    throw new Error("You do not have permission to modify this post");
  }
}

/** Resolve a post document into the public shape, including cover image URL. */
export async function resolvePost(
  ctx: QueryCtx | MutationCtx,
  post: PostDoc,
  currentUserId: Id<"users"> | null,
): Promise<Post> {
  const coverImageUrl = post.coverImageId
    ? await ctx.storage.getUrl(post.coverImageId)
    : null;

  return {
    _id: post._id,
    _creationTime: post._creationTime,
    authorId: post.authorId,
    authorName: post.authorName,
    title: post.title,
    slug: post.slug,
    body: post.body,
    excerpt: post.excerpt,
    coverImageId: post.coverImageId,
    coverImageUrl,
    status: post.status,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    isAuthor: currentUserId !== null && post.authorId === currentUserId,
  };
}

export async function resolvePosts(
  ctx: QueryCtx | MutationCtx,
  posts: PostDoc[],
  currentUserId: Id<"users"> | null,
): Promise<Post[]> {
  return await Promise.all(
    posts.map((post) => resolvePost(ctx, post, currentUserId)),
  );
}

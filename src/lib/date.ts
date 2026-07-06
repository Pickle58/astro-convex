import type { Post } from "./convex-types";

/** Format a post date for display, preferring publishedAt over creation time. */
export function formatPostDate(post: Post): string {
  return new Date(post.publishedAt ?? post._creationTime).toLocaleDateString();
}

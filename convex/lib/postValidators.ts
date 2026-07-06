import { paginationResultValidator } from "convex/server";
import { type Infer, v } from "convex/values";

export const postStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
);

export type PostStatus = Infer<typeof postStatusValidator>;

/** Public post shape returned by queries; coverImageUrl is resolved from storage. */
export const postValidator = v.object({
  _id: v.id("posts"),
  _creationTime: v.number(),
  authorId: v.id("users"),
  authorName: v.string(),
  title: v.string(),
  slug: v.string(),
  body: v.string(),
  excerpt: v.optional(v.string()),
  coverImageId: v.optional(v.id("_storage")),
  coverImageUrl: v.union(v.string(), v.null()),
  status: postStatusValidator,
  publishedAt: v.optional(v.number()),
  updatedAt: v.number(),
  isAuthor: v.boolean(),
});

export type Post = Infer<typeof postValidator>;

export const paginatedPostsValidator = paginationResultValidator(postValidator);

export type PaginatedPosts = Infer<typeof paginatedPostsValidator>;

export const createPostArgsValidator = {
  title: v.string(),
  body: v.string(),
  displayName: v.string(),
  excerpt: v.optional(v.string()),
  coverImageId: v.optional(v.id("_storage")),
  status: postStatusValidator,
};

export const updatePostArgsValidator = {
  postId: v.id("posts"),
  title: v.optional(v.string()),
  body: v.optional(v.string()),
  displayName: v.optional(v.string()),
  excerpt: v.optional(v.string()),
  coverImageId: v.optional(v.union(v.id("_storage"), v.null())),
  status: v.optional(postStatusValidator),
};

export const createPostResultValidator = v.object({
  id: v.id("posts"),
  slug: v.string(),
});

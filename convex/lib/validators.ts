import { paginationResultValidator } from "convex/server";
import { type Infer, v } from "convex/values";

/** Public comment shape returned by list queries (includes system fields). */
export const commentValidator = v.object({
  _id: v.id("comments"),
  _creationTime: v.number(),
  userId: v.id("users"),
  author: v.string(),
  content: v.string(),
  postId: v.optional(v.id("posts")),
});

export type Comment = Infer<typeof commentValidator>;

export const paginatedCommentsValidator =
  paginationResultValidator(commentValidator);

export type PaginatedComments = Infer<typeof paginatedCommentsValidator>;

export const createCommentArgsValidator = {
  content: v.string(),
  displayName: v.string(),
  postId: v.optional(v.id("posts")),
};

export const viewerValidator = v.union(
  v.object({
    name: v.string(),
  }),
  v.null(),
);

export type Viewer = Infer<typeof viewerValidator>;

export const setNameArgsValidator = {
  name: v.string(),
};

export const suggestCommentArgsValidator = {
  draft: v.string(),
};

export const suggestionQuotaValidator = v.object({
  used: v.number(),
  limit: v.number(),
  remaining: v.number(),
});

export const threadContextValidator = v.union(
  v.literal("coach"),
  v.literal("assistant"),
);

export type ThreadContext = Infer<typeof threadContextValidator>;

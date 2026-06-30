import { paginationResultValidator } from "convex/server";
import { type Infer, v } from "convex/values";

/** Public comment shape returned by list queries (includes system fields). */
export const commentValidator = v.object({
  _id: v.id("comments"),
  _creationTime: v.number(),
  userId: v.id("users"),
  author: v.string(),
  content: v.string(),
});

export type Comment = Infer<typeof commentValidator>;

export const paginatedCommentsValidator =
  paginationResultValidator(commentValidator);

export type PaginatedComments = Infer<typeof paginatedCommentsValidator>;

export const createCommentArgsValidator = {
  content: v.string(),
  displayName: v.string(),
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

import { paginationOptsValidator } from "convex/server";
import { type Infer, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { ensureCurrentUser, getCurrentUser } from "./lib/auth";
import {
  countComments,
  countCommentsByPost,
  normalizeCommentPage,
} from "./lib/comments";
import { isUsableDisplayName } from "./lib/displayName";
import {
  createCommentArgsValidator,
  paginatedCommentsValidator,
} from "./lib/validators";

export const create = mutation({
  args: createCommentArgsValidator,
  returns: v.id("comments"),
  handler: async (ctx, args): Promise<Id<"comments">> => {
    const user = await ensureCurrentUser(ctx);

    const displayName = args.displayName.trim();
    if (!isUsableDisplayName(displayName)) {
      throw new Error("Please enter your name");
    }
    if (displayName.length > 50) {
      throw new Error("Display name must be 50 characters or less");
    }

    const content = args.content.trim();
    if (!content) {
      throw new Error("Comment content is required");
    }

    if (user.name !== displayName) {
      await ctx.db.patch("users", user._id, { name: displayName });
    }

    return await ctx.db.insert("comments", {
      userId: user._id,
      author: displayName,
      content,
      postId: args.postId,
    });
  },
});

export const count = query({
  args: {},
  returns: v.number(),
  handler: async (ctx): Promise<number> => {
    return await countComments(ctx);
  },
});

/** Total comments for a single post. */
export const countByPost = query({
  args: {
    postId: v.id("posts"),
  },
  returns: v.number(),
  handler: async (ctx, args): Promise<number> => {
    return await countCommentsByPost(ctx, args.postId);
  },
});

/** Newest comments first. */
export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: paginatedCommentsValidator,
  handler: async (ctx, args): Promise<Infer<typeof paginatedCommentsValidator>> => {
    const result = await ctx.db
      .query("comments")
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: normalizeCommentPage(result.page),
    };
  },
});

/** Comments for a single post, newest first — uses the by_post index. */
export const listByPost = query({
  args: {
    postId: v.id("posts"),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginatedCommentsValidator,
  handler: async (ctx, args): Promise<Infer<typeof paginatedCommentsValidator>> => {
    const result = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: normalizeCommentPage(result.page),
    };
  },
});

/** Comments by display name, newest first — uses the by_author index. */
export const listByAuthor = query({
  args: {
    author: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginatedCommentsValidator,
  handler: async (ctx, args): Promise<Infer<typeof paginatedCommentsValidator>> => {
    const author = args.author.trim();
    if (!author) {
      throw new Error("Author name is required");
    }

    const result = await ctx.db
      .query("comments")
      .withIndex("by_author", (q) => q.eq("author", author))
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: normalizeCommentPage(result.page),
    };
  },
});

/** Comments for the signed-in user — uses the by_user index. */
export const listByCurrentUser = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: paginatedCommentsValidator,
  handler: async (ctx, args): Promise<Infer<typeof paginatedCommentsValidator>> => {
    const user = await getCurrentUser(ctx);

    const result = await ctx.db
      .query("comments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: normalizeCommentPage(result.page),
    };
  },
});

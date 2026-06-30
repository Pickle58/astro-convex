import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ensureCurrentUser } from "./lib/auth";
import {
  countComments,
  normalizeCommentPage,
} from "./lib/comments";
import { isUsableDisplayName } from "./lib/displayName";

const commentValidator = v.object({
  _id: v.id("comments"),
  _creationTime: v.number(),
  userId: v.id("users"),
  author: v.string(),
  content: v.string(),
});

export const create = mutation({
  args: {
    content: v.string(),
    displayName: v.string(),
  },
  returns: v.id("comments"),
  handler: async (ctx, args) => {
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
    });
  },
});

export const count = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    return await countComments(ctx);
  },
});

/** Newest comments first — uses the by_created index. */
export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(commentValidator),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("comments")
      .withIndex("by_created")
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
  returns: paginationResultValidator(commentValidator),
  handler: async (ctx, args) => {
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
  returns: paginationResultValidator(commentValidator),
  handler: async (ctx, args) => {
    const user = await ensureCurrentUser(ctx);

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

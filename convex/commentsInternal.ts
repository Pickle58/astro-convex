import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { normalizeCommentPage } from "./lib/comments";

const recentCommentValidator = v.object({
  author: v.string(),
  content: v.string(),
  _creationTime: v.number(),
});

export const listRecent = internalQuery({
  args: {
    limit: v.number(),
  },
  returns: v.array(recentCommentValidator),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(Math.floor(args.limit), 1), 10);
    const comments = await ctx.db.query("comments").order("desc").take(limit);
    return normalizeCommentPage(comments).map((comment) => ({
      author: comment.author,
      content: comment.content,
      _creationTime: comment._creationTime,
    }));
  },
});

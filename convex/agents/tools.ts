import { createTool } from "@convex-dev/agent";
import { z } from "zod/v3";
import { api, internal } from "../_generated/api";

export const listRecentCommentsTool = createTool({
  description:
    "Fetch recent comments from the community board for context before helping the user write.",
  inputSchema: z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(10)
      .describe("How many recent comments to return"),
  }),
  execute: async (ctx, args): Promise<string> => {
    const comments = await ctx.runQuery(internal.commentsInternal.listRecent, {
      limit: args.limit,
    });

    if (comments.length === 0) {
      return "No comments on the board yet.";
    }

    return comments
      .map(
        (comment, index) =>
          `${index + 1}. ${comment.author}: ${comment.content}`,
      )
      .join("\n");
  },
});

export const getCommentCountTool = createTool({
  description: "Get the total number of comments posted on the board.",
  inputSchema: z.object({}),
  execute: async (ctx): Promise<string> => {
    const count = await ctx.runQuery(api.comments.count, {});
    return `${count} comment${count === 1 ? "" : "s"} on the board.`;
  },
});

export const improveDraftTool = createTool({
  description:
    "Improve a comment draft for grammar and clarity. Returns polished text only.",
  inputSchema: z.object({
    draft: z.string().describe("The comment draft to improve"),
  }),
  execute: async (ctx, args): Promise<string> => {
    return await ctx.runAction(api.ai.suggestComment, { draft: args.draft });
  },
});

export const commentCoachTools = {
  listRecentComments: listRecentCommentsTool,
  getCommentCount: getCommentCountTool,
  improveDraft: improveDraftTool,
};

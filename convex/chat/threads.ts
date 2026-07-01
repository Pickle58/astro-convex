import { createThread } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { getAgentUserId, requireAgentUserId } from "../lib/agentAuth";

const emptyThreadPage = {
  page: [],
  isDone: true,
  continueCursor: "",
};

export const listThreads = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await getAgentUserId(ctx);
    if (!userId) {
      return emptyThreadPage;
    }

    return await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
      userId,
      paginationOpts: args.paginationOpts,
      order: "desc",
    });
  },
});

export const createNewThread = mutation({
  args: {
    title: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const userId = await requireAgentUserId(ctx);
    return await createThread(ctx, components.agent, {
      userId,
      title: args.title ?? "Comment coach",
    });
  },
});

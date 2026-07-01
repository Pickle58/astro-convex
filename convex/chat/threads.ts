import { createThread } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { getAgentUserId, requireAgentUserId } from "../lib/agentAuth";
import { filterThreadsByContext, insertThreadContext } from "../lib/threadContext";
import type { ThreadContext } from "../lib/threadContext";
import { threadContextValidator } from "../lib/validators";

const emptyThreadPage = {
  page: [],
  isDone: true,
  continueCursor: "",
};

function defaultTitle(context: ThreadContext): string {
  return context === "coach" ? "Comment coach" : "Assistant";
}

export const listThreads = query({
  args: {
    context: threadContextValidator,
    paginationOpts: paginationOptsValidator,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await getAgentUserId(ctx);
    if (!userId) {
      return emptyThreadPage;
    }

    const threads = await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
      userId,
      paginationOpts: args.paginationOpts,
      order: "desc",
    });

    return await filterThreadsByContext(ctx, userId, args.context, threads);
  },
});

export const createNewThread = mutation({
  args: {
    title: v.optional(v.string()),
    context: threadContextValidator,
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const userId = await requireAgentUserId(ctx);
    const title = args.title ?? defaultTitle(args.context);

    const threadId = await createThread(ctx, components.agent, {
      userId,
      title,
    });

    await insertThreadContext(ctx, { threadId, userId, context: args.context });
    return threadId;
  },
});

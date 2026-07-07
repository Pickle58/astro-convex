import { createThread, getThreadMetadata, updateThreadMetadata } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { getAgentUserId, requireAgentUserId } from "../lib/agentAuth";
import { filterThreadsByContext, insertThreadContext } from "../lib/threadContext";
import { defaultThreadTitle, resolveThreadTitle } from "../lib/threadTitles";
import { threadContextValidator } from "../lib/validators";

const emptyThreadPage = {
  page: [],
  isDone: true,
  continueCursor: "",
};

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

    const filtered = await filterThreadsByContext(ctx, userId, args.context, threads);
    const page = await Promise.all(
      filtered.page.map(async (thread) => ({
        ...thread,
        title: await resolveThreadTitle(ctx, args.context, thread),
      })),
    );

    return { ...filtered, page };
  },
});

export const hasThreadAccess = query({
  args: { threadId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const userId = await getAgentUserId(ctx);
    if (!userId) {
      return false;
    }

    try {
      const { userId: threadUserId } = await getThreadMetadata(ctx, components.agent, {
        threadId: args.threadId,
      });
      return threadUserId === userId;
    } catch {
      return false;
    }
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
    const title = args.title?.trim() || defaultThreadTitle(args.context);

    const threadId = await createThread(ctx, components.agent, {
      userId,
      title,
    });

    await insertThreadContext(ctx, { threadId, userId, context: args.context });
    return threadId;
  },
});

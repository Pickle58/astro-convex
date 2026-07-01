import { listUIMessages, saveMessage, syncStreams, vStreamArgs } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { authorizeThreadAccess, requireAgentUserId } from "../lib/agentAuth";

export const sendMessage = mutation({
  args: {
    threadId: v.string(),
    prompt: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { threadId, prompt }) => {
    await authorizeThreadAccess(ctx, threadId);

    const promptText = prompt.trim();
    if (!promptText) {
      throw new Error("Message is required");
    }

    const userId = await requireAgentUserId(ctx);

    const { messageId } = await saveMessage(ctx, components.agent, {
      threadId,
      userId,
      prompt: promptText,
    });

    await ctx.scheduler.runAfter(0, internal.chat.actions.generateResponse, {
      threadId,
      promptMessageId: messageId,
    });

    return null;
  },
});

export const listThreadMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    await authorizeThreadAccess(ctx, args.threadId);
    const paginated = await listUIMessages(ctx, components.agent, args);
    const streams = await syncStreams(ctx, components.agent, args);
    return { ...paginated, streams };
  },
});

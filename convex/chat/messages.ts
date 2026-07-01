import { listUIMessages, saveMessage, syncStreams, vStreamArgs, getThreadMetadata, updateThreadMetadata } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { authorizeThreadAccess, requireAgentUserId } from "../lib/agentAuth";
import { requireThreadContext } from "../lib/threadContext";
import { defaultThreadTitle, promptToThreadTitle } from "../lib/threadTitles";
import { threadContextValidator } from "../lib/validators";

export const sendMessage = mutation({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    context: threadContextValidator,
  },
  returns: v.null(),
  handler: async (ctx, { threadId, prompt, context }) => {
    await authorizeThreadAccess(ctx, threadId);

    const userId = await requireAgentUserId(ctx);
    await requireThreadContext(ctx, threadId, context, userId);

    const promptText = prompt.trim();
    if (!promptText) {
      throw new Error("Message is required");
    }

    const thread = await getThreadMetadata(ctx, components.agent, { threadId });
    if (thread.title === defaultThreadTitle(context)) {
      await updateThreadMetadata(ctx, components.agent, {
        threadId,
        patch: { title: promptToThreadTitle(promptText) },
      });
    }

    const { messageId } = await saveMessage(ctx, components.agent, {
      threadId,
      userId,
      prompt: promptText,
    });

    if (context === "coach") {
      await ctx.scheduler.runAfter(0, internal.chat.actions.generateCoachResponse, {
        threadId,
        promptMessageId: messageId,
      });
    } else {
      await ctx.scheduler.runAfter(
        0,
        internal.assistant.actions.generateAssistantResponse,
        { threadId, promptMessageId: messageId },
      );
    }

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

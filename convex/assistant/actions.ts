"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { generalAssistantAgent } from "../agents/generalAssistant";

export const generateAssistantResponse = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { threadId, promptMessageId }) => {
    await generalAssistantAgent.streamText(
      ctx,
      { threadId },
      { promptMessageId },
      { saveStreamDeltas: { throttleMs: 100 } },
    );
    return null;
  },
});

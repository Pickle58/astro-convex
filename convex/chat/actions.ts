"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { commentCoachAgent } from "../agents/commentCoach";

export const generateResponse = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { threadId, promptMessageId }) => {
    await commentCoachAgent.streamText(
      ctx,
      { threadId },
      { promptMessageId },
      { saveStreamDeltas: { throttleMs: 100 } },
    );
    return null;
  },
});

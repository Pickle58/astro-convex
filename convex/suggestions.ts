import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { ensureCurrentUser } from "./lib/auth";
import {
  countUserSuggestionsToday,
  DAILY_SUGGESTION_LIMIT,
  formatDailyLimitError,
} from "./lib/rateLimit";

async function assertWithinDailyLimit(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  dayStart: number,
): Promise<void> {
  const used = await countUserSuggestionsToday(ctx, userId, dayStart);
  if (used >= DAILY_SUGGESTION_LIMIT) {
    throw new Error(formatDailyLimitError());
  }
}

export const assertCanSuggest = internalMutation({
  args: {
    dayStart: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const user = await ensureCurrentUser(ctx);
    await assertWithinDailyLimit(ctx, user._id, args.dayStart);
    return null;
  },
});

export const saveSuggestion = internalMutation({
  args: {
    dayStart: v.number(),
    draft: v.string(),
    suggestion: v.string(),
    model: v.string(),
  },
  returns: v.id("commentSuggestions"),
  handler: async (ctx, args): Promise<Id<"commentSuggestions">> => {
    const user = await ensureCurrentUser(ctx);
    await assertWithinDailyLimit(ctx, user._id, args.dayStart);

    return await ctx.db.insert("commentSuggestions", {
      userId: user._id,
      draft: args.draft,
      suggestion: args.suggestion,
      model: args.model,
    });
  },
});

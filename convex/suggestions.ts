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
  SUGGESTION_RETENTION_MS,
} from "./lib/rateLimit";

const PURGE_BATCH_SIZE = 100;
const PURGE_MAX_BATCHES = 10;

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
    model: v.string(),
  },
  returns: v.id("commentSuggestions"),
  handler: async (ctx, args): Promise<Id<"commentSuggestions">> => {
    const user = await ensureCurrentUser(ctx);
    await assertWithinDailyLimit(ctx, user._id, args.dayStart);

    return await ctx.db.insert("commentSuggestions", {
      userId: user._id,
      model: args.model,
    });
  },
});

export const purgeExpired = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx): Promise<null> => {
    const cutoff = Date.now() - SUGGESTION_RETENTION_MS;

    for (let batch = 0; batch < PURGE_MAX_BATCHES; batch++) {
      const oldest = await ctx.db
        .query("commentSuggestions")
        .order("asc")
        .take(PURGE_BATCH_SIZE);

      if (oldest.length === 0) {
        break;
      }

      let deletedInBatch = 0;
      for (const row of oldest) {
        if (row._creationTime >= cutoff) {
          return null;
        }
        await ctx.db.delete("commentSuggestions", row._id);
        deletedInBatch++;
      }

      if (deletedInBatch < PURGE_BATCH_SIZE) {
        break;
      }
    }

    return null;
  },
});

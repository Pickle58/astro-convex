import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/** Max AI suggestions per user per UTC calendar day. */
export const DAILY_SUGGESTION_LIMIT = 20;

export function getUtcDayStart(timestamp: number): number {
  const date = new Date(timestamp);
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
}

export async function countUserSuggestionsToday(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  dayStart: number,
): Promise<number> {
  const suggestions = await ctx.db
    .query("commentSuggestions")
    .withIndex("by_user", (q) =>
      q.eq("userId", userId).gte("_creationTime", dayStart),
    )
    .collect();

  return suggestions.length;
}

export function formatDailyLimitError(): string {
  return `Daily suggestion limit reached (${DAILY_SUGGESTION_LIMIT}). Try again tomorrow.`;
}

import { type Infer, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  ensureCurrentUser,
  getCurrentUserOrNull,
} from "./lib/auth";
import { normalizeDisplayName, isUsableDisplayName } from "./lib/displayName";
import {
  countUserSuggestionsToday,
  DAILY_SUGGESTION_LIMIT,
} from "./lib/rateLimit";
import {
  setNameArgsValidator,
  suggestionQuotaValidator,
  viewerValidator,
} from "./lib/validators";

export const ensure = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx): Promise<Id<"users">> => {
    const user = await ensureCurrentUser(ctx);
    return user._id;
  },
});

export const setName = mutation({
  args: setNameArgsValidator,
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const user = await ensureCurrentUser(ctx);
    const name = args.name.trim();

    if (!isUsableDisplayName(name)) {
      throw new Error("Please enter your name");
    }
    if (name.length > 50) {
      throw new Error("Display name must be 50 characters or less");
    }

    await ctx.db.patch("users", user._id, { name });
    return null;
  },
});

export const viewer = query({
  args: {},
  returns: viewerValidator,
  handler: async (ctx): Promise<Infer<typeof viewerValidator>> => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return null;
    }
    return { name: normalizeDisplayName(user.name) };
  },
});

export const suggestionQuota = query({
  args: {
    dayStart: v.number(),
  },
  returns: v.union(suggestionQuotaValidator, v.null()),
  handler: async (ctx, args): Promise<Infer<typeof suggestionQuotaValidator> | null> => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return null;
    }

    const used = await countUserSuggestionsToday(ctx, user._id, args.dayStart);
    return {
      used,
      limit: DAILY_SUGGESTION_LIMIT,
      remaining: Math.max(0, DAILY_SUGGESTION_LIMIT - used),
    };
  },
});

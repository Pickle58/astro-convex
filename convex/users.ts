import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  ensureCurrentUser,
  getCurrentUserOrNull,
} from "./lib/auth";
import { normalizeDisplayName, isUsableDisplayName } from "./lib/displayName";

const viewerValidator = v.union(
  v.object({
    name: v.string(),
  }),
  v.null(),
);

export const ensure = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    const user = await ensureCurrentUser(ctx);
    return user._id;
  },
});

export const setName = mutation({
  args: {
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
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
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return null;
    }
    return { name: normalizeDisplayName(user.name) };
  },
});

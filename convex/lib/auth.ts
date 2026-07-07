import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { isUsableDisplayName, normalizeDisplayName } from "./displayName";

export async function ensureCurrentUser(
  ctx: MutationCtx,
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const existingUser = await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique();

  if (existingUser) {
    if (!isUsableDisplayName(existingUser.name)) {
      const cleanedName = normalizeDisplayName(existingUser.name);
      if (existingUser.name !== cleanedName) {
        await ctx.db.patch("users", existingUser._id, { name: cleanedName });
        return { ...existingUser, name: cleanedName };
      }
    }
    return existingUser;
  }

  const userId = await ctx.db.insert("users", {
    tokenIdentifier: identity.tokenIdentifier,
    name: "",
    email: identity.email ?? "",
    imageUrl: identity.pictureUrl,
  });

  const user = await ctx.db.get("users", userId);
  if (!user) {
    throw new Error("Failed to create user");
  }

  return user;
}

export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const user = await getCurrentUserOrNull(ctx);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
}

export async function getCurrentUserOrNull(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique();
}

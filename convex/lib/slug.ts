import type { MutationCtx, QueryCtx } from "../_generated/server";

/** Convert a title into a URL-safe slug. */
export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "post";
}

async function slugExists(
  ctx: QueryCtx | MutationCtx,
  slug: string,
): Promise<boolean> {
  const existing = await ctx.db
    .query("posts")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
  return existing !== null;
}

/**
 * Generate a slug from a title, appending -2, -3, ... until it is unique.
 * Collisions are resolved silently so callers never see an error.
 */
export async function generateUniqueSlug(
  ctx: MutationCtx,
  title: string,
): Promise<string> {
  const base = slugify(title);
  if (!(await slugExists(ctx, base))) {
    return base;
  }

  let suffix = 2;
  while (await slugExists(ctx, `${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}

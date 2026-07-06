import { paginationOptsValidator } from "convex/server";
import { type Infer, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { ensureCurrentUser, getCurrentUserOrNull, syncDisplayName } from "./lib/auth";
import {
  assertAuthor,
  normalizeBody,
  normalizeExcerpt,
  normalizePostDisplayName,
  normalizeTitle,
  resolvePost,
  resolvePosts,
} from "./lib/posts";
import {
  createPostArgsValidator,
  createPostResultValidator,
  paginatedPostsValidator,
  postValidator,
  updatePostArgsValidator,
} from "./lib/postValidators";
import { generateUniqueSlug } from "./lib/slug";

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx): Promise<string> => {
    await ensureCurrentUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Resolve a freshly uploaded storage id to a servable URL (authors only). */
export const getImageUrl = query({
  args: { storageId: v.id("_storage") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args): Promise<string | null> => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return null;
    }
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const create = mutation({
  args: createPostArgsValidator,
  returns: createPostResultValidator,
  handler: async (ctx, args): Promise<Infer<typeof createPostResultValidator>> => {
    const user = await ensureCurrentUser(ctx);

    const title = normalizeTitle(args.title);
    const body = normalizeBody(args.body);
    const displayName = normalizePostDisplayName(args.displayName);
    const excerpt = normalizeExcerpt(args.excerpt);

    await syncDisplayName(ctx, user, displayName);

    const now = Date.now();
    const slug = await generateUniqueSlug(ctx, title);

    const id = await ctx.db.insert("posts", {
      authorId: user._id,
      authorName: displayName,
      title,
      slug,
      body,
      excerpt,
      coverImageId: args.coverImageId,
      status: args.status,
      publishedAt: args.status === "published" ? now : undefined,
      updatedAt: now,
    });

    return { id, slug };
  },
});

export const update = mutation({
  args: updatePostArgsValidator,
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const user = await ensureCurrentUser(ctx);
    const post = await ctx.db.get("posts", args.postId);
    if (!post) {
      throw new Error("Post not found");
    }
    assertAuthor(post, user._id);

    const patch: {
      title?: string;
      body?: string;
      excerpt?: string | undefined;
      coverImageId?: Id<"_storage"> | undefined;
      authorName?: string;
      status?: "draft" | "published";
      publishedAt?: number;
      updatedAt: number;
    } = { updatedAt: Date.now() };

    if (args.title !== undefined) {
      patch.title = normalizeTitle(args.title);
    }
    if (args.body !== undefined) {
      patch.body = normalizeBody(args.body);
    }
    if (args.excerpt !== undefined) {
      patch.excerpt = normalizeExcerpt(args.excerpt);
    }
    if (args.coverImageId !== undefined) {
      patch.coverImageId = args.coverImageId ?? undefined;
    }
    if (args.displayName !== undefined) {
      const displayName = normalizePostDisplayName(args.displayName);
      patch.authorName = displayName;
      await syncDisplayName(ctx, user, displayName);
    }
    if (args.status !== undefined) {
      patch.status = args.status;
      // Set publishedAt the first time a post becomes published.
      if (args.status === "published" && post.publishedAt === undefined) {
        patch.publishedAt = patch.updatedAt;
      }
    }

    await ctx.db.patch("posts", args.postId, patch);
    return null;
  },
});

export const remove = mutation({
  args: { postId: v.id("posts") },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const user = await ensureCurrentUser(ctx);
    const post = await ctx.db.get("posts", args.postId);
    if (!post) {
      return null;
    }
    assertAuthor(post, user._id);

    // Delete all comments scoped to this post before removing the post document.
    let cursor: string | null = null;
    while (true) {
      const { page, isDone, continueCursor } = await ctx.db
        .query("comments")
        .withIndex("by_post", (q) => q.eq("postId", args.postId))
        .paginate({ numItems: 100, cursor });
      await Promise.all(page.map((c) => ctx.db.delete("comments", c._id)));
      if (isDone) break;
      cursor = continueCursor;
    }

    await ctx.db.delete("posts", args.postId);
    return null;
  },
});

/** Published posts, newest first. Public. */
export const listPublished = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: paginatedPostsValidator,
  handler: async (ctx, args): Promise<Infer<typeof paginatedPostsValidator>> => {
    const currentUser = await getCurrentUserOrNull(ctx);
    const result = await ctx.db
      .query("posts")
      .withIndex("by_status_and_published", (q) => q.eq("status", "published"))
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: await resolvePosts(ctx, result.page, currentUser?._id ?? null),
    };
  },
});

/** The signed-in user's draft posts, newest first. */
export const listMyDrafts = query({
  args: {},
  returns: v.array(postValidator),
  handler: async (ctx): Promise<Infer<typeof postValidator>[]> => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return [];
    }

    const drafts = await ctx.db
      .query("posts")
      .withIndex("by_author_and_status", (q) =>
        q.eq("authorId", user._id).eq("status", "draft"),
      )
      .order("desc")
      .take(100);

    return await resolvePosts(ctx, drafts, user._id);
  },
});

/** A single post by slug. Drafts are visible only to their author. */
export const getBySlug = query({
  args: { slug: v.string() },
  returns: v.union(postValidator, v.null()),
  handler: async (ctx, args): Promise<Infer<typeof postValidator> | null> => {
    const post = await ctx.db
      .query("posts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!post) {
      return null;
    }

    const currentUser = await getCurrentUserOrNull(ctx);
    const isAuthor = currentUser !== null && post.authorId === currentUser._id;

    if (post.status === "draft" && !isAuthor) {
      return null;
    }

    return await resolvePost(ctx, post, currentUser?._id ?? null);
  },
});

/** A single post by id for editing. Author-only. */
export const getById = query({
  args: { postId: v.id("posts") },
  returns: v.union(postValidator, v.null()),
  handler: async (ctx, args): Promise<Infer<typeof postValidator> | null> => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return null;
    }

    const post = await ctx.db.get("posts", args.postId);
    if (!post || post.authorId !== user._id) {
      return null;
    }

    return await resolvePost(ctx, post, user._id);
  },
});

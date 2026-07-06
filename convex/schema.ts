import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.string(), // User-chosen display name for comment labels
    email: v.string(),
    imageUrl: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"]),

  comments: defineTable({
    userId: v.id("users"),
    author: v.string(),
    content: v.string(),
    // Optional so pre-blog global comments remain valid; blog comments always set it.
    postId: v.optional(v.id("posts")),
  })
    .index("by_user", ["userId"])
    .index("by_author", ["author"])
    .index("by_post", ["postId"]),

  posts: defineTable({
    authorId: v.id("users"),
    authorName: v.string(),
    title: v.string(),
    slug: v.string(),
    body: v.string(), // Markdown
    excerpt: v.optional(v.string()),
    coverImageId: v.optional(v.id("_storage")),
    status: v.union(v.literal("draft"), v.literal("published")),
    publishedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_author", ["authorId"])
    .index("by_status_and_published", ["status", "publishedAt"]),

  commentSuggestions: defineTable({
    userId: v.id("users"),
    model: v.string(),
  }).index("by_user", ["userId"]),

  threadContexts: defineTable({
    threadId: v.string(),
    userId: v.string(),
    context: v.union(v.literal("coach"), v.literal("assistant")),
  })
    .index("by_user_and_context", ["userId", "context"])
    .index("by_thread", ["threadId"]),
});

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
  })
    .index("by_user", ["userId"])
    .index("by_author", ["author"]),

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

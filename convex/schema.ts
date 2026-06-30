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
    .index("by_user", ["userId", "_creationTime"])
    .index("by_author", ["author", "_creationTime"])
    .index("by_created", ["_creationTime"]),
});

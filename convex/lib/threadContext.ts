import { getThreadMetadata } from "@convex-dev/agent";
import type { Infer } from "convex/values";
import { components } from "../_generated/api";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { threadContextValidator } from "./validators";

export type ThreadContext = Infer<typeof threadContextValidator>;

type DbCtx = QueryCtx | MutationCtx;

export async function insertThreadContext(
  ctx: MutationCtx,
  args: { threadId: string; userId: string; context: ThreadContext },
): Promise<void> {
  await ctx.db.insert("threadContexts", args);
}

export async function getThreadContext(
  ctx: DbCtx,
  threadId: string,
): Promise<ThreadContext | null> {
  const row = await ctx.db
    .query("threadContexts")
    .withIndex("by_thread", (q) => q.eq("threadId", threadId))
    .unique();
  return row?.context ?? null;
}

async function lazyBackfillCoachContext(
  ctx: MutationCtx,
  threadId: string,
  userId: string,
): Promise<ThreadContext | null> {
  const { title } = await getThreadMetadata(ctx, components.agent, { threadId });
  if (title !== "Comment coach") {
    return null;
  }
  await insertThreadContext(ctx, { threadId, userId, context: "coach" });
  return "coach";
}

export async function requireThreadContext(
  ctx: MutationCtx,
  threadId: string,
  expectedContext: ThreadContext,
  userId: string,
): Promise<void> {
  let context = await getThreadContext(ctx, threadId);

  if (!context) {
    if (expectedContext === "coach") {
      context = await lazyBackfillCoachContext(ctx, threadId, userId);
    }
  }

  if (!context) {
    throw new Error("Thread context not found");
  }
  if (context !== expectedContext) {
    throw new Error("Invalid thread for this agent");
  }
}

export async function filterThreadsByContext(
  ctx: DbCtx,
  userId: string,
  context: ThreadContext,
  threadPage: { page: Array<{ _id: string }>; isDone: boolean; continueCursor: string },
): Promise<typeof threadPage> {
  const contextRows = await ctx.db
    .query("threadContexts")
    .withIndex("by_user_and_context", (q) =>
      q.eq("userId", userId).eq("context", context),
    )
    .collect();

  const allowedIds = new Set(contextRows.map((row) => row.threadId));

  return {
    ...threadPage,
    page: threadPage.page.filter((thread) => allowedIds.has(thread._id)),
  };
}

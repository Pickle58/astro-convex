import { getThreadMetadata } from "@convex-dev/agent";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import { components } from "../_generated/api";

export async function getAgentUserId(
  ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.tokenIdentifier ?? null;
}

export async function requireAgentUserId(
  ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<string> {
  const userId = await getAgentUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  return userId;
}

export async function authorizeThreadAccess(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  threadId: string,
): Promise<void> {
  const userId = await requireAgentUserId(ctx);
  const { userId: threadUserId } = await getThreadMetadata(ctx, components.agent, {
    threadId,
  });

  if (threadUserId !== userId) {
    throw new Error("Unauthorized: you do not have access to this thread");
  }
}

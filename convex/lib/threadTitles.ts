import { components } from "../_generated/api";
import type { QueryCtx } from "../_generated/server";
import type { ThreadContext } from "./threadContext";

export function defaultThreadTitle(context: ThreadContext): string {
  return context === "coach" ? "Comment coach" : "Assistant";
}

export function promptToThreadTitle(prompt: string, maxLength = 60): string {
  const singleLine = prompt.trim().replace(/\s+/g, " ");
  if (!singleLine) {
    return "Untitled";
  }
  if (singleLine.length <= maxLength) {
    return singleLine;
  }
  return `${singleLine.slice(0, maxLength - 1)}…`;
}

async function getFirstUserPrompt(
  ctx: QueryCtx,
  threadId: string,
): Promise<string | null> {
  const messages = await ctx.runQuery(
    components.agent.messages.listMessagesByThreadId,
    {
      threadId,
      order: "asc",
      excludeToolMessages: true,
      paginationOpts: { numItems: 20, cursor: null },
    },
  );

  for (const message of messages.page) {
    if (message.message?.role === "user") {
      const text = message.text?.trim();
      if (text) {
        return text;
      }
    }
  }
  return null;
}

export async function resolveThreadTitle(
  ctx: QueryCtx,
  context: ThreadContext,
  thread: { _id: string; title?: string },
): Promise<string> {
  const storedTitle = thread.title;
  if (storedTitle && storedTitle !== defaultThreadTitle(context)) {
    return storedTitle;
  }

  const prompt = await getFirstUserPrompt(ctx, thread._id);
  if (prompt) {
    return promptToThreadTitle(prompt);
  }

  return storedTitle ?? defaultThreadTitle(context);
}

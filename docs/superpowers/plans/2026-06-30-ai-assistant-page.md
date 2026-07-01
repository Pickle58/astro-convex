# AI Assistant Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a static `/assistant` page with a general Q&A agent, thread sidebar, and shared chat infrastructure; keep the comment coach on `/` with context-isolated threads.

**Architecture:** Add a `threadContexts` Convex table (`coach` | `assistant`). Extend thread/message APIs with a `context` arg. Two agents share one `@convex-dev/agent` component but route to separate `streamText` actions. Extract shared React chat UI; Astro prerenders the page shell, React island handles interactivity.

**Tech Stack:** Astro 6 (static output), React 19 islands, Clerk, Convex, `@convex-dev/agent` v0.6.x, `@ai-sdk/openai`, Tailwind v4, Cloudflare Workers

**Spec:** `docs/superpowers/specs/2026-06-30-ai-assistant-page-design.md`

---

## File map

| File | Responsibility |
|------|----------------|
| `convex/schema.ts` | `threadContexts` table + indexes |
| `convex/lib/validators.ts` | `threadContextValidator` |
| `convex/lib/threadContext.ts` | Insert, require, filter, lazy backfill |
| `convex/agents/generalAssistant.ts` | No-tools Q&A agent |
| `convex/chat/threads.ts` | `context` on create/list |
| `convex/chat/messages.ts` | `context` on send; route to correct action |
| `convex/chat/actions.ts` | Rename `generateResponse` → `generateCoachResponse` |
| `convex/assistant/actions.ts` | `generateAssistantResponse` |
| `src/components/agent/types.ts` | `ThreadContext` type |
| `src/components/agent/AgentMessage.tsx` | Message bubble |
| `src/components/agent/AgentChatPanel.tsx` | Streaming chat panel |
| `src/components/agent/ThreadSidebar.tsx` | Thread list sidebar |
| `src/components/agent/AgentChatErrorBoundary.tsx` | Shared error boundary |
| `src/hooks/useAgentThreads.ts` | Generalized thread hook |
| `src/components/CommentAgentChat.tsx` | Thin coach wrapper |
| `src/components/AssistantApp.tsx` | Full-page assistant layout |
| `src/pages/assistant.astro` | Static shell |
| `src/components/NavBar.astro` | Nav link |

---

### Task 1: Schema and validators

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/lib/validators.ts`

- [ ] **Step 1: Add `threadContexts` to schema**

In `convex/schema.ts`, add after `commentSuggestions`:

```typescript
  threadContexts: defineTable({
    threadId: v.string(),
    userId: v.string(),
    context: v.union(v.literal("coach"), v.literal("assistant")),
  })
    .index("by_user_and_context", ["userId", "context"])
    .index("by_thread", ["threadId"]),
```

- [ ] **Step 2: Add validator**

At end of `convex/lib/validators.ts`:

```typescript
export const threadContextValidator = v.union(
  v.literal("coach"),
  v.literal("assistant"),
);

export type ThreadContext = Infer<typeof threadContextValidator>;
```

- [ ] **Step 3: Push schema to Convex**

Run: `cd C:/Users/jpilk/Documents/Projects/astro-convex && pnpm dev:convex` (or ensure `pnpm dev` is running)

Expected: Convex dashboard shows new `threadContexts` table; no push errors.

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts convex/lib/validators.ts
git commit -m "feat: add threadContexts schema for coach vs assistant threads"
```

---

### Task 2: Thread context helpers

**Files:**
- Create: `convex/lib/threadContext.ts`

- [ ] **Step 1: Create helper module**

Create `convex/lib/threadContext.ts`:

```typescript
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
```

- [ ] **Step 2: Typecheck Convex**

Run: `cd C:/Users/jpilk/Documents/Projects/astro-convex && pnpm typecheck`

Expected: exit 0

- [ ] **Step 3: Commit**

```bash
git add convex/lib/threadContext.ts
git commit -m "feat: add thread context helpers with lazy coach backfill"
```

---

### Task 3: Extend thread APIs with context

**Files:**
- Modify: `convex/chat/threads.ts`

- [ ] **Step 1: Replace `convex/chat/threads.ts`**

```typescript
import { createThread } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { getAgentUserId, requireAgentUserId } from "../lib/agentAuth";
import { filterThreadsByContext, insertThreadContext } from "../lib/threadContext";
import { threadContextValidator } from "../lib/validators";

const emptyThreadPage = {
  page: [],
  isDone: true,
  continueCursor: "",
};

function defaultTitle(context: "coach" | "assistant"): string {
  return context === "coach" ? "Comment coach" : "Assistant";
}

export const listThreads = query({
  args: {
    context: threadContextValidator,
    paginationOpts: paginationOptsValidator,
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await getAgentUserId(ctx);
    if (!userId) {
      return emptyThreadPage;
    }

    const threads = await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
      userId,
      paginationOpts: args.paginationOpts,
      order: "desc",
    });

    return await filterThreadsByContext(ctx, userId, args.context, threads);
  },
});

export const createNewThread = mutation({
  args: {
    title: v.optional(v.string()),
    context: threadContextValidator,
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const userId = await requireAgentUserId(ctx);
    const title = args.title ?? defaultTitle(args.context);

    const threadId = await createThread(ctx, components.agent, {
      userId,
      title,
    });

    await insertThreadContext(ctx, { threadId, userId, context: args.context });
    return threadId;
  },
});
```

- [ ] **Step 2: Verify Convex push**

Expected: `listThreads` and `createNewThread` deploy without errors.

- [ ] **Step 3: Commit**

```bash
git add convex/chat/threads.ts
git commit -m "feat: scope agent threads by coach or assistant context"
```

---

### Task 4: Rename coach action and extend sendMessage

**Files:**
- Modify: `convex/chat/actions.ts`
- Modify: `convex/chat/messages.ts`

- [ ] **Step 1: Rename action in `convex/chat/actions.ts`**

Change export name only (handler body unchanged):

```typescript
export const generateCoachResponse = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { threadId, promptMessageId }) => {
    await commentCoachAgent.streamText(
      ctx,
      { threadId },
      { promptMessageId },
      { saveStreamDeltas: { throttleMs: 100 } },
    );
    return null;
  },
});
```

Delete the old `generateResponse` export if it still exists.

- [ ] **Step 2: Update `convex/chat/messages.ts`**

Replace `sendMessage` handler and imports:

```typescript
import { listUIMessages, saveMessage, syncStreams, vStreamArgs } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components, internal } from "../_generated/api";
import { mutation, query } from "../_generated/server";
import { authorizeThreadAccess, requireAgentUserId } from "../lib/agentAuth";
import { requireThreadContext } from "../lib/threadContext";
import { threadContextValidator } from "../lib/validators";

export const sendMessage = mutation({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    context: threadContextValidator,
  },
  returns: v.null(),
  handler: async (ctx, { threadId, prompt, context }) => {
    await authorizeThreadAccess(ctx, threadId);

    const userId = await requireAgentUserId(ctx);
    await requireThreadContext(ctx, threadId, context, userId);

    const promptText = prompt.trim();
    if (!promptText) {
      throw new Error("Message is required");
    }

    const { messageId } = await saveMessage(ctx, components.agent, {
      threadId,
      userId,
      prompt: promptText,
    });

    if (context === "coach") {
      await ctx.scheduler.runAfter(0, internal.chat.actions.generateCoachResponse, {
        threadId,
        promptMessageId: messageId,
      });
    } else {
      await ctx.scheduler.runAfter(
        0,
        internal.assistant.actions.generateAssistantResponse,
        { threadId, promptMessageId: messageId },
      );
    }

    return null;
  },
});
```

Keep `listThreadMessages` unchanged.

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`

Expected: exit 0 (assistant action stub may fail until Task 5 — implement Task 5 before final typecheck if needed)

- [ ] **Step 4: Commit**

```bash
git add convex/chat/actions.ts convex/chat/messages.ts
git commit -m "feat: route sendMessage by thread context"
```

---

### Task 5: General assistant agent and action

**Files:**
- Create: `convex/agents/generalAssistant.ts`
- Create: `convex/assistant/actions.ts`

- [ ] **Step 1: Create general assistant agent**

Create `convex/agents/generalAssistant.ts`:

```typescript
import { Agent, stepCountIs } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { components } from "../_generated/api";

export const generalAssistantAgent = new Agent(components.agent, {
  name: "Assistant",
  languageModel: openai.chat("gpt-4o-mini"),
  instructions: `You are a helpful general-purpose assistant.
Answer questions clearly and concisely.
You do not have access to the community comment board or user data.
If you are unsure, say so. Do not invent facts.`,
  tools: {},
  stopWhen: stepCountIs(3),
});
```

- [ ] **Step 2: Create assistant action**

Create `convex/assistant/actions.ts`:

```typescript
"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { generalAssistantAgent } from "../agents/generalAssistant";

export const generateAssistantResponse = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { threadId, promptMessageId }) => {
    await generalAssistantAgent.streamText(
      ctx,
      { threadId },
      { promptMessageId },
      { saveStreamDeltas: { throttleMs: 100 } },
    );
    return null;
  },
});
```

- [ ] **Step 3: Typecheck and Convex push**

Run: `pnpm typecheck`

Expected: exit 0; Convex bundles `assistant/actions.ts`.

- [ ] **Step 4: Commit**

```bash
git add convex/agents/generalAssistant.ts convex/assistant/actions.ts
git commit -m "feat: add general assistant agent and streaming action"
```

---

### Task 6: Shared agent types and AgentMessage

**Files:**
- Create: `src/components/agent/types.ts`
- Create: `src/components/agent/AgentMessage.tsx`

- [ ] **Step 1: Create types**

Create `src/components/agent/types.ts`:

```typescript
export type ThreadContext = "coach" | "assistant";
```

- [ ] **Step 2: Extract AgentMessage**

Create `src/components/agent/AgentMessage.tsx` (copy from `CommentAgentChat.tsx` lines 11–31):

```typescript
import type { UIMessage } from "@convex-dev/agent/react";

export function AgentMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const isStreaming = !isUser && message.status === "streaming";
  const displayText = message.text || "…";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
          isUser
            ? "bg-indigo-600 text-white"
            : "border border-gray-200 bg-gray-50 text-gray-800"
        }`}
      >
        {displayText}
        {isStreaming && message.text && (
          <span className="ml-0.5 inline-block animate-pulse text-indigo-400">▍</span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/agent/types.ts src/components/agent/AgentMessage.tsx
git commit -m "refactor: extract shared AgentMessage component"
```

---

### Task 7: Shared AgentChatPanel

**Files:**
- Create: `src/components/agent/AgentChatPanel.tsx`

- [ ] **Step 1: Create AgentChatPanel**

Create `src/components/agent/AgentChatPanel.tsx`:

```typescript
import {
  optimisticallySendMessage,
  useUIMessages,
} from "@convex-dev/agent/react";
import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { AgentMessage } from "./AgentMessage";
import type { ThreadContext } from "./types";

export type AgentChatPanelProps = {
  threadId: string;
  context: ThreadContext;
  emptyStateMessage: string;
  inputPlaceholder: string;
  className?: string;
  messagesClassName?: string;
};

export function AgentChatPanel({
  threadId,
  context,
  emptyStateMessage,
  inputPlaceholder,
  className,
  messagesClassName = "max-h-80",
}: AgentChatPanelProps) {
  const { results, status, loadMore } = useUIMessages(
    api.chat.messages.listThreadMessages,
    { threadId },
    { initialNumItems: 20, stream: true },
  );
  const sendMessage = useMutation(api.chat.messages.sendMessage).withOptimisticUpdate(
    optimisticallySendMessage(api.chat.messages.listThreadMessages),
  );
  const [prompt, setPrompt] = useState("");
  const [sendError, setSendError] = useState<string>();

  const handleSend = () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      return;
    }

    setSendError(undefined);
    setPrompt("");

    void sendMessage({ threadId, prompt: trimmed, context }).catch((error) => {
      console.error(error);
      setPrompt(trimmed);
      setSendError(
        error instanceof Error ? error.message : "Could not send message.",
      );
    });
  };

  const canSend = prompt.trim().length > 0;

  return (
    <div className={className ?? "flex flex-col gap-3"}>
      <div
        className={`space-y-3 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 ${messagesClassName}`}
      >
        {status === "LoadingFirstPage" && (
          <p className="text-sm text-gray-500">Loading messages…</p>
        )}
        {status !== "LoadingFirstPage" && (results?.length ?? 0) === 0 && (
          <p className="text-sm text-gray-500">{emptyStateMessage}</p>
        )}
        {results?.map((message) => (
          <AgentMessage key={message.key} message={message} />
        ))}
      </div>

      {status === "CanLoadMore" && (
        <button
          type="button"
          onClick={() => loadMore(20)}
          className="self-start text-sm text-indigo-600 hover:text-indigo-800"
        >
          Load older messages
        </button>
      )}

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          handleSend();
        }}
      >
        <input
          value={prompt}
          onChange={(event) => {
            setPrompt(event.target.value);
            if (sendError) {
              setSendError(undefined);
            }
          }}
          placeholder={inputPlaceholder}
          className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!canSend}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Send
        </button>
      </form>

      {sendError && <p className="text-sm text-red-600">{sendError}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/agent/AgentChatPanel.tsx
git commit -m "refactor: extract shared AgentChatPanel with context-aware send"
```

---

### Task 8: Generalized useAgentThreads hook

**Files:**
- Create: `src/hooks/useAgentThreads.ts`
- Delete: `src/hooks/useCommentCoachThread.ts` (after migration)

- [ ] **Step 1: Create `src/hooks/useAgentThreads.ts`**

Generalize `useCommentCoachThread.ts` with parameters:

```typescript
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { ThreadContext } from "../components/agent/types";

function readThreadIdFromHash(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const hash = window.location.hash.replace(/^#/, "").trim();
  return hash.length > 0 ? hash : null;
}

function readThreadIdFromStorage(storageKey: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(storageKey);
}

function persistThreadId(storageKey: string, threadId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(storageKey, threadId);
  if (readThreadIdFromHash() !== threadId) {
    window.location.hash = threadId;
  }
}

type UseAgentThreadsOptions = {
  context: ThreadContext;
  storageKey: string;
};

export function useAgentThreads({ context, storageKey }: UseAgentThreadsOptions) {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const createThread = useMutation(api.chat.threads.createNewThread);
  const canUseConvex = isAuthenticated && !isAuthLoading;
  const [threadId, setThreadIdState] = useState<string | null>(() =>
    readThreadIdFromHash() ?? readThreadIdFromStorage(storageKey),
  );
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [error, setError] = useState<string>();
  const isEnsuringRef = useRef(false);

  const setThreadId = useCallback(
    (id: string) => {
      setThreadIdState(id);
      persistThreadId(storageKey, id);
    },
    [storageKey],
  );

  const recentThreads = useQuery(
    api.chat.threads.listThreads,
    canUseConvex && threadId === null
      ? { context, paginationOpts: { numItems: 1, cursor: null } }
      : "skip",
  );

  useEffect(() => {
    const onHashChange = () => {
      const id = readThreadIdFromHash();
      if (id) {
        setThreadIdState(id);
        localStorage.setItem(storageKey, id);
      }
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey || !event.newValue) {
        return;
      }
      setThreadIdState(event.newValue);
      if (readThreadIdFromHash() !== event.newValue) {
        window.location.hash = event.newValue;
      }
    };

    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [storageKey]);

  useEffect(() => {
    if (!canUseConvex) {
      return;
    }
    if (threadId !== null || isEnsuringRef.current) {
      return;
    }

    const existing =
      readThreadIdFromHash() ?? readThreadIdFromStorage(storageKey);
    if (existing) {
      setThreadId(existing);
      return;
    }
    if (recentThreads === undefined) {
      return;
    }

    isEnsuringRef.current = true;
    let cancelled = false;

    async function ensureThread() {
      setIsCreatingThread(true);
      setError(undefined);
      try {
        const latest = recentThreads.page[0]?._id as string | undefined;
        if (latest) {
          if (!cancelled) {
            setThreadId(latest);
          }
          return;
        }

        const raced =
          readThreadIdFromStorage(storageKey) ?? readThreadIdFromHash();
        if (raced) {
          if (!cancelled) {
            setThreadId(raced);
          }
          return;
        }

        const id = await createThread({ context });
        if (!cancelled) {
          setThreadId(id);
        }
      } catch (createError) {
        console.error(createError);
        if (!cancelled) {
          setError(
            createError instanceof Error
              ? createError.message
              : "Could not start agent chat.",
          );
        }
      } finally {
        isEnsuringRef.current = false;
        if (!cancelled) {
          setIsCreatingThread(false);
        }
      }
    }

    void ensureThread();
    return () => {
      cancelled = true;
    };
  }, [canUseConvex, threadId, recentThreads, createThread, setThreadId, context, storageKey]);

  const startNewThread = useCallback(async () => {
    setIsCreatingThread(true);
    setError(undefined);
    try {
      const id = await createThread({ context });
      setThreadId(id);
    } catch (createError) {
      console.error(createError);
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not start a new chat.",
      );
    } finally {
      setIsCreatingThread(false);
    }
  }, [createThread, setThreadId, context]);

  const clearThread = useCallback(() => {
    setThreadIdState(null);
    isEnsuringRef.current = false;
    if (typeof window !== "undefined") {
      localStorage.removeItem(storageKey);
      if (window.location.hash) {
        history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
      }
    }
  }, [storageKey]);

  return {
    threadId,
    setThreadId,
    isCreatingThread,
    error,
    startNewThread,
    clearThread,
  };
}
```

- [ ] **Step 2: Delete `src/hooks/useCommentCoachThread.ts`**

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAgentThreads.ts
git rm src/hooks/useCommentCoachThread.ts
git commit -m "refactor: generalize thread hook with context and storage key"
```

---

### Task 9: Refactor CommentAgentChat

**Files:**
- Modify: `src/components/CommentAgentChat.tsx`

- [ ] **Step 1: Replace CommentAgentChat with thin wrapper**

```typescript
import { Authenticated, Unauthenticated, useConvexAuth } from "convex/react";
import { useEffect } from "react";
import { AgentChatPanel } from "./agent/AgentChatPanel";
import { useAgentThreads } from "../hooks/useAgentThreads";

export function CommentAgentChat() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const { threadId, isCreatingThread, error, startNewThread, clearThread } =
    useAgentThreads({ context: "coach", storageKey: "commentCoachThreadId" });

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      clearThread();
    }
  }, [isAuthenticated, isAuthLoading, clearThread]);

  return (
    <section className="mb-10 rounded-xl border border-indigo-100 bg-indigo-50/40 p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Comment coach</h3>
          <p className="mt-1 text-sm text-gray-600">
            Multi-step agent with tools, persistent threads, and live streaming replies.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void startNewThread()}
          disabled={isCreatingThread || !isAuthenticated}
          className="shrink-0 rounded-md border border-indigo-200 bg-white px-3 py-1.5 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50 disabled:opacity-60"
        >
          New chat
        </button>
      </div>

      <Unauthenticated>
        <p className="text-sm text-gray-600">Sign in to chat with the comment coach.</p>
      </Unauthenticated>

      <Authenticated>
        {isAuthLoading && (
          <p className="text-sm text-gray-500">Checking sign-in…</p>
        )}
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {isCreatingThread && threadId === null && (
          <p className="text-sm text-gray-500">Starting chat…</p>
        )}
        {threadId && (
          <AgentChatPanel
            key={threadId}
            threadId={threadId}
            context="coach"
            emptyStateMessage="Ask for help writing a comment, getting board context, or polishing a draft. The coach can use tools to read recent comments and improve text."
            inputPlaceholder="Ask the comment coach…"
          />
        )}
      </Authenticated>
    </section>
  );
}
```

- [ ] **Step 2: Manual regression test on `/`**

Run: `pnpm dev`, open `http://localhost:4323/`, sign in, send coach message.

Expected: streaming reply; tools work for board questions.

- [ ] **Step 3: Commit**

```bash
git add src/components/CommentAgentChat.tsx
git commit -m "refactor: comment coach uses shared AgentChatPanel and useAgentThreads"
```

---

### Task 10: ThreadSidebar component

**Files:**
- Create: `src/components/agent/ThreadSidebar.tsx`

- [ ] **Step 1: Create ThreadSidebar**

```typescript
import { usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { ThreadContext } from "./types";

type ThreadSidebarProps = {
  context: ThreadContext;
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onNewChat: () => void;
  isCreating: boolean;
};

export function ThreadSidebar({
  context,
  activeThreadId,
  onSelectThread,
  onNewChat,
  isCreating,
}: ThreadSidebarProps) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.chat.threads.listThreads,
    { context },
    { initialNumItems: 20 },
  );

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-gray-200 bg-white md:w-64 md:border-r md:border-b-0">
      <div className="border-b border-gray-200 p-3">
        <button
          type="button"
          onClick={onNewChat}
          disabled={isCreating}
          className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          New chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {results.length === 0 && (
          <p className="px-2 py-3 text-sm text-gray-500">No conversations yet.</p>
        )}
        <ul className="space-y-1">
          {results.map((thread) => {
            const id = thread._id as string;
            const isActive = id === activeThreadId;
            const title = (thread.title as string | undefined) ?? "Untitled";
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onSelectThread(id)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    isActive
                      ? "bg-indigo-50 font-medium text-indigo-900"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {title}
                </button>
              </li>
            );
          })}
        </ul>
        {status === "CanLoadMore" && (
          <button
            type="button"
            onClick={() => loadMore(20)}
            className="mt-2 w-full px-3 py-2 text-left text-sm text-indigo-600 hover:text-indigo-800"
          >
            Load more
          </button>
        )}
      </div>
    </aside>
  );
}
```

Note: `usePaginatedQuery` is imported from `convex/react` (same as `CommentList.tsx`).

- [ ] **Step 2: Commit**

```bash
git add src/components/agent/ThreadSidebar.tsx
git commit -m "feat: add thread sidebar for assistant page"
```

---

### Task 11: Shared error boundary and AssistantApp

**Files:**
- Create: `src/components/agent/AgentChatErrorBoundary.tsx`
- Create: `src/components/AssistantApp.tsx`
- Modify: `src/components/Comments.tsx` (optional: use shared boundary)

- [ ] **Step 1: Create AgentChatErrorBoundary**

Extract from `Comments.tsx` `CommentAgentChatErrorBoundary` into `src/components/agent/AgentChatErrorBoundary.tsx` with prop `label: string` (e.g. `"Comment coach"` / `"Assistant"`).

- [ ] **Step 2: Create AssistantApp.tsx**

```typescript
import { Authenticated, Unauthenticated, useConvexAuth } from "convex/react";
import { useEffect } from "react";
import { withConvexProvider } from "../lib/convex.tsx";
import { useEnsureUser } from "./CommentForm";
import { AgentChatPanel } from "./agent/AgentChatPanel";
import { AgentChatErrorBoundary } from "./agent/AgentChatErrorBoundary";
import { ThreadSidebar } from "./agent/ThreadSidebar";
import { useAgentThreads } from "../hooks/useAgentThreads";

function AssistantAppInner() {
  useEnsureUser();
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const {
    threadId,
    setThreadId,
    isCreatingThread,
    error,
    startNewThread,
    clearThread,
  } = useAgentThreads({ context: "assistant", storageKey: "assistantThreadId" });

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      clearThread();
    }
  }, [isAuthenticated, isAuthLoading, clearThread]);

  return (
    <AgentChatErrorBoundary label="Assistant">
      <Unauthenticated>
        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-gray-600">
          Sign in to use the assistant.
        </p>
      </Unauthenticated>

      <Authenticated>
        {isAuthLoading && (
          <p className="text-sm text-gray-500">Checking sign-in…</p>
        )}
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <div className="flex min-h-[calc(100vh-8rem)] flex-col md:flex-row">
          <ThreadSidebar
            context="assistant"
            activeThreadId={threadId}
            onSelectThread={setThreadId}
            onNewChat={() => void startNewThread()}
            isCreating={isCreatingThread}
          />
          <main className="flex flex-1 flex-col p-4">
            {isCreatingThread && threadId === null && (
              <p className="text-sm text-gray-500">Starting chat…</p>
            )}
            {!threadId && !isCreatingThread && (
              <p className="text-sm text-gray-500">
                Select a conversation or start a new chat.
              </p>
            )}
            {threadId && (
              <AgentChatPanel
                key={threadId}
                threadId={threadId}
                context="assistant"
                emptyStateMessage="Ask anything. This assistant has no access to the comment board."
                inputPlaceholder="Ask the assistant…"
                messagesClassName="min-h-[20rem] max-h-[calc(100vh-14rem)]"
                className="flex h-full flex-col gap-3"
              />
            )}
          </main>
        </div>
      </Authenticated>
    </AgentChatErrorBoundary>
  );
}

export default withConvexProvider(AssistantAppInner);
```

- [ ] **Step 3: Update Comments.tsx to use shared boundary (optional)**

Replace inline `CommentAgentChatErrorBoundary` with `AgentChatErrorBoundary label="Comment coach"`.

- [ ] **Step 4: Commit**

```bash
git add src/components/agent/AgentChatErrorBoundary.tsx src/components/AssistantApp.tsx src/components/Comments.tsx
git commit -m "feat: add AssistantApp with sidebar layout and shared error boundary"
```

---

### Task 12: Static Astro page and navigation

**Files:**
- Create: `src/pages/assistant.astro`
- Modify: `src/components/NavBar.astro`

- [ ] **Step 1: Create static page**

Create `src/pages/assistant.astro`:

```astro
---
import AssistantApp from "../components/AssistantApp.tsx";
import Layout from "../layouts/Layout.astro";
---

<Layout title="Assistant">
  <main class="mx-auto max-w-6xl px-4 py-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Assistant</h1>
      <p class="mt-1 text-sm text-gray-600">
        General-purpose Q&amp;A with live streaming replies. Sign in to start a conversation.
      </p>
    </div>
    <AssistantApp client:only="react" />
  </main>
</Layout>
```

Do **not** add `export const prerender = false`.

- [ ] **Step 2: Add nav link**

In `src/components/NavBar.astro`, add before About link:

```astro
      <a
        href="/assistant"
        class="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
      >
        Assistant
      </a>
```

- [ ] **Step 3: Verify static build**

Run: `pnpm build`

Expected: `assistant/index.html` generated; build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/pages/assistant.astro src/components/NavBar.astro
git commit -m "feat: add static /assistant page and nav link"
```

---

### Task 13: End-to-end manual testing

**Files:** none

- [ ] **Step 1: Static shell**

Open `http://localhost:4323/assistant`, View Page Source.

Expected: HTML contains “Assistant” heading and intro text without requiring JS.

- [ ] **Step 2: Signed-out state**

Sign out. Expected: “Sign in to use the assistant” in island.

- [ ] **Step 3: Assistant chat**

Sign in → New chat → ask “What is TypeScript?” Expected: streaming reply.

- [ ] **Step 4: Sidebar isolation**

Create two assistant threads. Open `/` coach — coach threads must not appear in assistant sidebar.

- [ ] **Step 5: Coach regression**

On `/`, send “What are people talking about?” Expected: tool use + streaming coach reply.

- [ ] **Step 6: Multi-tab**

Open two `/assistant` tabs. Send in one tab. Expected: both tabs show same streaming update.

- [ ] **Step 7: Update spec status**

In `docs/superpowers/specs/2026-06-30-ai-assistant-page-design.md`, set `Status: Implemented`.

- [ ] **Step 8: Final commit**

```bash
git add docs/superpowers/specs/2026-06-30-ai-assistant-page-design.md
git commit -m "docs: mark AI assistant page spec as implemented"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| `threadContexts` table | Task 1 |
| Context helpers + lazy backfill | Task 2 |
| `createNewThread` / `listThreads` with context | Task 3 |
| `sendMessage` routes by context | Task 4 |
| `generateCoachResponse` rename | Task 4 |
| `generalAssistant` agent | Task 5 |
| `generateAssistantResponse` | Task 5 |
| Shared `AgentChatPanel` / `AgentMessage` | Tasks 6–7 |
| `useAgentThreads` hook | Task 8 |
| Coach refactor on `/` | Task 9 |
| Thread sidebar | Task 10 |
| `AssistantApp` + error boundary | Task 11 |
| Static `/assistant` + nav | Task 12 |
| Testing plan | Task 13 |

## Plan self-review

- No TBD/TODO placeholders in task steps
- `context` naming consistent across backend and frontend
- `sendMessage` includes `context` before coach regression test (Task 9 after Task 4)
- ThreadSidebar notes checking `usePaginatedQuery` source — engineer must verify against `CommentList.tsx`

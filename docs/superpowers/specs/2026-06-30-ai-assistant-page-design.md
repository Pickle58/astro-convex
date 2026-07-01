# Design: AI Assistant Page (Shared Chat + Thread Context)

**Date:** 2026-06-30  
**Status:** Implemented  
**Scope:** Dedicated `/assistant` page (static Astro shell + React island), general Q&A agent, shared chat infrastructure with context-scoped threads; comment coach unchanged on `/`

## Goal

Add a full-page AI assistant at `/assistant` for signed-in users: open Q&A with streaming replies and a thread sidebar. Reuse the existing `@convex-dev/agent` chat stack (threads, messages, streaming) while keeping the comment coach embedded on the home page as a separate agent with board-specific tools.

## Decisions (approved)

| Topic | Choice |
|-------|--------|
| Scope | Two agents, shared chat infrastructure |
| General assistant | Open Q&A, no board tools |
| Auth | Signed-in only (Clerk) |
| Home `/` | Keep embedded comment coach |
| `/assistant` UX | Thread sidebar + main chat panel |
| Approach | Shared chat module + `threadContexts` metadata |

## Context

- **Stack:** Astro 6 (`output: "static"`), Cloudflare Workers, Clerk, Convex, `@convex-dev/agent` v0.6.x, React islands, Tailwind v4
- **Deployed:** GitHub + Cloudflare + Convex cloud
- **Existing coach:** `CommentAgentChat`, `useCommentCoachThread`, streaming via `streamText` + `useUIMessages({ stream: true })`, tools in `convex/agents/tools.ts`
- **Home page:** `src/pages/index.astro` uses `prerender = false` + `Comments` island; **not changed** in this spec
- **Prerequisites:** `OPENAI_API_KEY`, agent component in `convex/convex.config.ts`, Clerk JWT on Convex

## Chosen approach

**Shared chat module + thread context metadata**

- Extract reusable UI/hooks under `src/components/agent/`
- Add `threadContexts` table to distinguish `coach` vs `assistant` threads
- New `generalAssistant` agent (no tools)
- Static prerendered `/assistant` Astro page; interactivity in a React island

**Rejected alternatives**

- Duplicate `chat/` and `assistant/` backend trees — unnecessary maintenance
- Single agent with per-thread mode — coach tools would leak into general Q&A

## Architecture

```
/assistant.astro (prerender: true — static shell)
  └─ AssistantApp (client:only="react")
       ├─ withConvexProvider + Clerk
       ├─ ThreadSidebar — listThreads({ context: "assistant" })
       └─ AgentChatPanel — streaming chat for selected threadId

/ (unchanged)
  └─ Comments island → CommentAgentChat (context: "coach")

Convex
  ├─ schema.threadContexts
  ├─ agents/commentCoach.ts       (tools — existing)
  ├─ agents/generalAssistant.ts   (no tools)
  ├─ lib/threadContext.ts         (helpers: assert, filter, insert)
  ├─ chat/threads.ts              create/list with context
  ├─ chat/messages.ts             send/list; routes to correct action
  ├─ chat/actions.ts              generateCoachResponse
  └─ assistant/actions.ts         generateAssistantResponse
```

## Data model

### `threadContexts` table

```typescript
threadContexts: defineTable({
  threadId: v.string(),
  userId: v.string(), // Clerk tokenIdentifier (same as agent userId)
  context: v.union(v.literal("coach"), v.literal("assistant")),
})
  .index("by_user_and_context", ["userId", "context"])
  .index("by_thread", ["threadId"])
```

**Rules**

- One row per agent thread, inserted in the same mutation as `createThread`
- `listThreads` filters agent threads to those with a matching `context` row for the current user
- `sendMessage` / `authorizeThreadAccess` verify thread belongs to user **and** matches expected `context`
- Existing coach threads created before this migration have no row — see Migration below

### Validators (`convex/lib/validators.ts`)

```typescript
export const threadContextValidator = v.union(
  v.literal("coach"),
  v.literal("assistant"),
);
```

## Backend

### `convex/lib/threadContext.ts`

Plain functions (testable, reused by mutations/queries):

| Function | Purpose |
|----------|---------|
| `insertThreadContext(ctx, { threadId, userId, context })` | Insert metadata after `createThread` |
| `getThreadContext(ctx, threadId)` | Return context or null |
| `requireThreadContext(ctx, threadId, expectedContext)` | Throw if missing or mismatch |
| `filterThreadsByContext(ctx, userId, context, threadPage)` | Filter `listThreadsByUserId` page |

### `convex/agents/generalAssistant.ts`

```typescript
export const generalAssistantAgent = new Agent(components.agent, {
  name: "Assistant",
  languageModel: openai.chat("gpt-4o-mini"),
  instructions: `You are a helpful general-purpose assistant.
Answer questions clearly and concisely.
You do not have access to the community comment board or user data.
If you are unsure, say so. Do not invent facts.`,
  tools: {}, // no tools
  stopWhen: stepCountIs(3),
});
```

### `convex/chat/threads.ts` (extend)

**`createNewThread`**

| Arg | Validator | Notes |
|-----|-----------|-------|
| `title` | `v.optional(v.string())` | Default by context |
| `context` | `threadContextValidator` | Required |

**Behavior**

1. `requireAgentUserId`
2. `createThread` with title default: `"Comment coach"` or `"Assistant"`
3. `insertThreadContext`
4. Return `threadId`

**`listThreads`**

| Arg | Validator |
|-----|-----------|
| `context` | `threadContextValidator` |
| `paginationOpts` | `paginationOptsValidator` |

**Behavior**

1. `getAgentUserId` — return empty page if unauthenticated
2. `listThreadsByUserId` (order desc, as today)
3. `filterThreadsByContext`
4. Return filtered paginated result

**Breaking change:** `createNewThread` gains required `context`. Update coach call sites to pass `context: "coach"`.

### `convex/chat/messages.ts` (extend)

**`sendMessage`**

| Arg | Validator |
|-----|-----------|
| `threadId` | `v.string()` |
| `prompt` | `v.string()` |
| `context` | `threadContextValidator` |

**Behavior**

1. `authorizeThreadAccess`
2. `requireThreadContext(ctx, threadId, context)`
3. `saveMessage` (unchanged)
4. Schedule response:
   - `context === "coach"` → `internal.chat.actions.generateCoachResponse`
   - `context === "assistant"` → `internal.assistant.actions.generateAssistantResponse`

**`listThreadMessages`**

- Args unchanged (`threadId`, `paginationOpts`, `streamArgs`)
- Handler: `authorizeThreadAccess` only (any context — thread ID is authoritative once user owns it)

Rename existing action export for clarity:

- `generateResponse` → `generateCoachResponse` in `convex/chat/actions.ts`

### `convex/assistant/actions.ts` (new)

```typescript
"use node";

export const generateAssistantResponse = internalAction({
  args: { threadId: v.string(), promptMessageId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await generalAssistantAgent.streamText(
      ctx,
      { threadId: args.threadId },
      { promptMessageId: args.promptMessageId },
      { saveStreamDeltas: { throttleMs: 100 } },
    );
    return null;
  },
});
```

Coach action mirrors this pattern (rename only; logic unchanged).

## Frontend

### Static page: `src/pages/assistant.astro`

- **No** `export const prerender = false` — page is fully static (HTML shell)
- Uses `Layout` with title `"Assistant"`
- Static intro copy (what the assistant is, sign-in required)
- `<AssistantApp client:only="react" />`
- No Convex/Clerk data fetched at build time

### Nav: `src/components/NavBar.astro`

- Add link: **Assistant** → `/assistant` (between logo area and About, or after About)

### Shared module: `src/components/agent/`

| File | Responsibility |
|------|----------------|
| `AgentMessage.tsx` | User/assistant bubble, streaming cursor |
| `AgentChatPanel.tsx` | `useUIMessages` + send form; props: `threadId`, `context`, API refs |
| `ThreadSidebar.tsx` | Thread list, active state, New chat, load more |
| `types.ts` | `ThreadContext = "coach" \| "assistant"` |

**`AgentChatPanel` props**

```typescript
type AgentChatPanelProps = {
  threadId: string;
  context: ThreadContext;
  emptyStateMessage?: string;
  className?: string;
};
```

Uses:

- `useUIMessages(api.chat.messages.listThreadMessages, { threadId }, { initialNumItems: 20, stream: true })`
- `useMutation(api.chat.messages.sendMessage).withOptimisticUpdate(optimisticallySendMessage(...))`
- Passes `context` on `sendMessage`

### `src/components/AssistantApp.tsx`

- `withConvexProvider` wrapper (or inner export pattern matching `Comments.tsx`)
- `useEnsureUser()` on mount (existing)
- Layout: flex row, min-height ~`calc(100vh - nav)`
  - **Sidebar (~260px):** `ThreadSidebar` with `context: "assistant"`
  - **Main:** `AgentChatPanel` when `threadId` selected; else empty state
- Auth gates:
  - `<Unauthenticated>` — “Sign in to use the assistant”
  - `<Authenticated>` — full UI
- Error boundary (reuse pattern from `Comments.tsx` or shared `AgentChatErrorBoundary`)

### `src/hooks/useAgentThreads.ts` (generalize from `useCommentCoachThread`)

```typescript
useAgentThreads({
  context: "coach" | "assistant",
  storageKey: string, // e.g. "commentCoachThreadId" | "assistantThreadId"
})
```

**Behavior**

- Hash + `localStorage` sync (separate keys per context)
- `storage` event for multi-tab
- On auth ready: restore from hash/storage → else `listThreads({ context })` latest → else `createNewThread({ context })`
- Race guard before create (same as coach hook today)
- Returns: `{ threadId, setThreadId, threads, loadMoreThreads, startNewThread, isCreating, error, clearThread }`

**`CommentAgentChat.tsx` refactor**

- Use `AgentChatPanel` + `useAgentThreads({ context: "coach", storageKey: "commentCoachThreadId" })`
- Keep compact card UI on `/` (no sidebar)
- Pass `context: "coach"` on all thread/message calls

### Mobile (v1)

- Sidebar stacks above chat below `md` breakpoint, or collapses with a simple “Chats” toggle
- No dedicated native app patterns in v1

## Migration: existing coach threads

Threads created before `threadContexts` exist will not appear in filtered lists and may fail `requireThreadContext` on send.

**One-time internal mutation** `internal.migrations.backfillCoachThreadContexts`:

1. For current user (or all users in dev): list agent threads with title `"Comment coach"` (or all threads without a context row owned by user)
2. Insert `threadContexts` row with `context: "coach"`

Run manually in Convex dashboard after deploy, or on first `listThreads({ context: "coach" })` lazily backfill threads the user can still access via hash/storage.

**v1 recommendation:** Lazy backfill in `requireThreadContext` — if no row but `authorizeThreadAccess` passes and thread title is `"Comment coach"`, insert `coach` row. Removes need for separate migration job.

## Error handling

| Scenario | Behavior |
|----------|----------|
| Missing/invalid thread in hash | Clear storage; show empty state + New chat |
| `sendMessage` context mismatch | Error: “Invalid thread” |
| Convex query failure | Inline error in sidebar or panel; log to console |
| OpenAI failure | Stream ends; assistant message may show error state from agent |
| Unauthenticated | Static shell loads; island shows sign-in prompt |

Reuse existing `CommentAgentChatErrorBoundary` pattern; consider one shared `AgentChatErrorBoundary` component.

## Security

- All public chat functions require Clerk identity
- `requireThreadContext` prevents posting to another agent’s thread namespace
- General assistant has **no tools** — no board data access
- Coach tools unchanged; only reachable via coach context + `generateCoachResponse`
- Thread IDs remain unguessable; ownership checked via agent component + `authorizeThreadAccess`

## Performance

- Sidebar paginates threads (`initialNumItems: 20`)
- Streaming `throttleMs: 100` (same as coach)
- Static `/assistant` shell cacheable at CDN edge; JS island hydrates client-side

## Out of scope (v1)

- Rename/delete threads
- Auto-generated thread titles from first message
- Thread sidebar on `/` for coach
- Anonymous/guest chat
- Web search or external tools for assistant
- Moving comment coach off `/`
- Shared thread list across agents

## Testing plan

1. **`/assistant` static shell** — View source / disable JS: layout, nav, intro text present
2. **Signed out** — Sign-in prompt in island; no chat API calls that throw
3. **Signed in — new thread** — New chat → send question → streaming reply
4. **Sidebar** — Multiple threads; switch between them; history preserved
5. **Context isolation** — Coach threads do not appear in assistant sidebar; vice versa
6. **Home regression** — `/` comment coach still sends, streams, uses tools
7. **Multi-tab** — Two `/assistant` tabs share `assistantThreadId` + hash
8. **Production** — Deploy Convex + Cloudflare; smoke test both routes

## Files touched

| File | Change |
|------|--------|
| `convex/schema.ts` | Add `threadContexts` |
| `convex/lib/validators.ts` | `threadContextValidator` |
| `convex/lib/threadContext.ts` | New — context helpers |
| `convex/agents/generalAssistant.ts` | New — no-tools agent |
| `convex/chat/threads.ts` | `context` on create/list |
| `convex/chat/messages.ts` | `context` on send; schedule by context |
| `convex/chat/actions.ts` | Rename → `generateCoachResponse` |
| `convex/assistant/actions.ts` | New — `generateAssistantResponse` |
| `src/pages/assistant.astro` | New — static shell |
| `src/components/AssistantApp.tsx` | New — sidebar + chat layout |
| `src/components/agent/*` | New — shared UI |
| `src/hooks/useAgentThreads.ts` | New — generalized thread hook |
| `src/components/CommentAgentChat.tsx` | Refactor to shared modules |
| `src/components/Comments.tsx` | Optional: shared error boundary |
| `src/components/NavBar.astro` | Link to `/assistant` |
| `docs/superpowers/specs/2026-06-30-ai-assistant-page-design.md` | This spec |

## Rollout order

1. Schema + `threadContext` helpers + backfill logic
2. Extend `threads` / `messages` / actions; deploy Convex
3. Extract shared agent UI components
4. Refactor coach to use shared modules (verify `/` regression)
5. Add `generalAssistant` + assistant action
6. Build `AssistantApp` + static page + nav link
7. Manual test locally, then deploy

## Spec self-review

- **Placeholders:** None; defaults, file list, and migration strategy are explicit
- **Consistency:** Context flows from create → list → send → generate action; coach and assistant paths symmetric
- **Scope:** Single feature slice; no unrelated refactors
- **Ambiguity:** Lazy coach backfill chosen over batch migration; mobile UX scoped to simple responsive layout

# Design: Streaming Replies for Comment Coach

**Date:** 2026-06-30  
**Status:** Awaiting review  
**Scope:** Real-time assistant text streaming in the existing Comment Coach chat (Option A — reply text only)

## Goal

When the comment coach generates a reply, the assistant message should appear incrementally (word-by-word / chunk-by-chunk) instead of showing the full response only after generation completes. User messages, send flow, tools, and thread persistence stay unchanged.

## Context

- **Stack:** Astro 6 (hybrid SSR), React islands, Convex, Clerk, `@convex-dev/agent` v0.6.x, OpenAI via `@ai-sdk/openai`
- **Current chat flow:**
  1. `CommentAgentChat` → `sendMessage` mutation saves user message
  2. Scheduled `internal.chat.actions.generateResponse` calls `commentCoachAgent.generateText`
  3. Client uses `useUIMessages` + `listUIMessages` (no streaming)
- **Recent fix:** `useUIMessages` must pair with `listUIMessages` (not `useThreadMessages`)
- **Prerequisite:** `OPENAI_API_KEY` in Convex env; agent component registered in `convex/convex.config.ts`



## Chosen approach

**Convex delta streaming** via `@convex-dev/agent`:

- Backend saves stream deltas during `streamText` (`saveStreamDeltas: true`)
- `listThreadMessages` query merges paginated messages with `syncStreams`
- Client enables `stream: true` on `useUIMessages`

Rejected alternatives:

- HTTP streaming from a public action — poor fit for Astro islands + Clerk auth
- Client-side fake typewriter after full response — not real streaming



## Architecture

```
CommentAgentChat (React island)
  └─ useUIMessages(listThreadMessages, { threadId }, { stream: true })
       └─ query: listThreadMessages
            ├─ listUIMessages(...)     → saved messages (user + finished assistant)
            └─ syncStreams(...)        → live deltas for in-progress assistant text

sendMessage mutation (unchanged)
  ├─ saveMessage(user prompt)
  └─ scheduler → generateResponse internal action
       └─ commentCoachAgent.streamText(..., { saveStreamDeltas: true })
            ├─ tool steps (listRecentComments, getCommentCount, improveDraft)
            └─ assistant text chunks → agent component delta storage
```

Streaming uses the **agent component’s** delta storage. No new tables in the app schema.

## Backend changes



### `convex/chat/actions.ts`

Replace `generateText` with `streamText`:

```typescript
await commentCoachAgent.streamText(
  ctx,
  { threadId },
  { promptMessageId },
  { saveStreamDeltas: { throttleMs: 100 } },
);
```


| Setting            | Value                  | Rationale                                                 |
| ------------------ | ---------------------- | --------------------------------------------------------- |
| `saveStreamDeltas` | `true` (with throttle) | Persists chunks for reactive client subscriptions         |
| `throttleMs`       | `100`                  | Balance smooth UI vs write bandwidth; tunable later       |
| `chunking`         | default (word)         | Acceptable for short coach replies; no custom regex in v1 |


Await the full `streamText` call so the action completes only after the agent run finishes (same lifecycle as today’s `generateText`). Tool calls and multi-step agent behavior remain unchanged.

### `convex/chat/messages.ts`

Extend `listThreadMessages`:

**New args**


| Field        | Validator     | Notes                                             |
| ------------ | ------------- | ------------------------------------------------- |
| `streamArgs` | `vStreamArgs` | From `@convex-dev/agent`; required for delta sync |


Existing args unchanged: `threadId`, `paginationOpts`.

**Handler**

1. `authorizeThreadAccess(ctx, args.threadId)` (unchanged)
2. `paginated = await listUIMessages(ctx, components.agent, args)`
3. `streams = await syncStreams(ctx, components.agent, args)`
4. Return `{ ...paginated, streams }`

**Returns:** keep `v.any()` for now (agent paginated shape + streams); matches existing pattern and agent docs.

### Unchanged backend files


| File                            | Reason                                     |
| ------------------------------- | ------------------------------------------ |
| `convex/chat/threads.ts`        | Thread create/list unchanged               |
| `convex/agents/commentCoach.ts` | Same agent, tools, `stepCountIs(5)`        |
| `convex/agents/tools.ts`        | Tools already on `inputSchema` / `execute` |
| `convex/lib/agentAuth.ts`       | Same thread authorization                  |




## Frontend changes



### `src/components/CommentAgentChat.tsx`

**Hook**

```typescript
const { results, status, loadMore } = useUIMessages(
  api.chat.messages.listThreadMessages,
  { threadId },
  { initialNumItems: 20, stream: true },
);
```

**AgentMessage**

- Render `message.text` as today (grows reactively as deltas arrive)
- When `message.role === "assistant"` and `message.status === "streaming"`:
  - If `message.text` is empty, show `"…"` (thinking placeholder)
  - Optionally append a subtle cursor (`▍`) at end of non-empty streaming text

**Unchanged**

- Optimistic send via `optimisticallySendMessage`
- Thread creation / New chat
- Error boundary in `Comments.tsx`
- No `useSmoothText` / `SmoothText` in v1



### Copy tweak (optional)

Update subtitle from “async replies” to mention live streaming — cosmetic only.

## Error handling


| Scenario                      | Behavior                                                                  |
| ----------------------------- | ------------------------------------------------------------------------- |
| `streamText` / OpenAI failure | Agent marks message failed; UI shows fallback text; existing server logs  |
| `sendMessage` failure         | Optimistic rollback + red error under input (existing)                    |
| Query / stream sync failure   | Error boundary shows amber fallback (existing)                            |
| Tool failure mid-agent-run    | Coach may respond with error explanation in streamed text (agent default) |
| User refreshes mid-stream     | `syncStreams` resumes from persisted deltas                               |


No new error boundaries or client retry logic in v1.

## Security

- `listThreadMessages` still calls `authorizeThreadAccess` before returning messages or streams
- Stream deltas scoped to thread; thread scoped to Clerk `tokenIdentifier` userId
- No public streaming HTTP endpoint
- No change to auth or rate limits for chat (separate from `suggestComment` quota)



## Performance

- Delta writes throttled at 100ms to limit Convex bandwidth
- Coach replies are short; pagination stays at 20 messages
- Tool-heavy prompts may have a silent gap before first text delta (expected for Option A)



## Out of scope (v1)

- Tool-step status UI (“Reading comments…”)
- `useSmoothText` / `SmoothText` typing animation
- HTTP `toUIMessageStreamResponse` endpoint
- Separate `listStreams` query
- Streaming for one-shot **Suggest edit** (`api.ai.suggestComment`)
- Message abort / stop generation button



## Testing plan

1. **Simple prompt** — e.g. “Help me write a friendly comment” — assistant text grows incrementally
2. **Tool prompt** — e.g. “What are people talking about?” — pause during tools, then text streams
3. **Multi-tab** — same thread in two tabs shows identical live updates
4. **Refresh mid-stream** — page reload shows partial then completed message
5. **Send failure** — disconnect Convex briefly or invalid auth — input restored, error shown
6. **Regression** — user optimistic message, load older messages, new chat thread all still work



## Files touched


| File                                                            | Change                                             |
| --------------------------------------------------------------- | -------------------------------------------------- |
| `convex/chat/actions.ts`                                        | `generateText` → `streamText` + `saveStreamDeltas` |
| `convex/chat/messages.ts`                                       | Add `streamArgs`, `syncStreams`, merged return     |
| `src/components/CommentAgentChat.tsx`                           | `stream: true`, streaming status in `AgentMessage` |
| `docs/superpowers/specs/2026-06-30-streaming-replies-design.md` | This spec                                          |




## Rollout

1. Implement backend first; run `pnpm dev` until Convex sync succeeds
2. Update client hook + message rendering
3. Manual test with tool and non-tool prompts
4. Deploy Convex + frontend together (query args change requires synced client)



## Spec self-review

- **Placeholders:** None; throttle and file list are concrete
- **Consistency:** Delta streaming path aligned across action, query, and hook
- **Scope:** Single feature (assistant text streaming only); no unrelated refactors
- **Ambiguity:** Option A explicitly excludes tool UI and smooth animation; streaming indicator limited to assistant `status === "streaming"`


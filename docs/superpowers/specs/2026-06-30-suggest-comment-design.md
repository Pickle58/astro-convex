# Design: AI Comment Suggest (Minimal)

**Date:** 2026-06-30  
**Status:** Awaiting review  
**Scope:** One `suggestComment` Convex Action + button in `CommentForm`

## Goal

Let signed-in users polish a comment draft with AI before posting. The suggestion improves grammar and clarity while preserving meaning and roughly similar length. The Action does not write comments — posting still uses the existing `comments.create` mutation — but it does record each successful suggestion in `commentSuggestions` (user + model only) for daily rate limiting. Draft and suggestion text are not stored.

## Context

- **Stack:** Astro 6 (hybrid SSR), React islands, Convex, Clerk, Cloudflare Workers
- **Existing UI:** `CommentForm.tsx` inside `Comments` island with `withConvexProvider`
- **Auth:** Clerk JWT validated by Convex (`convex/auth.config.ts`)
- **Prerequisite:** `OPENAI_API_KEY` set in Convex environment (dev + prod)

## Architecture

```
CommentForm (React island)
  ├─ useQuery(api.users.suggestionQuota) — remaining daily suggestions
  └─ useAction(api.ai.suggestComment)
       └─ Convex Action (convex/ai.ts, "use node")
            ├─ ctx.auth.getUserIdentity() — require sign-in
            ├─ internal.suggestions.assertCanSuggest — daily rate limit check
            ├─ OpenAI chat.completions (gpt-4o-mini)
            ├─ internal.suggestions.saveSuggestion — usage record (userId, model)
            └─ returns string → setContent() in textarea
  └─ useMutation(api.comments.create) — unchanged Post flow
```

## Backend

### New file: `convex/ai.ts`

- First line: `"use node"`
- Export: `suggestComment` action

**Arguments**

| Field   | Validator   | Notes                          |
|---------|-------------|----------------------------------|
| `draft` | `v.string()` | Raw textarea content            |

**Returns**

| Type        | Validator   |
|-------------|-------------|
| Suggestion  | `v.string()` |

**Handler behavior**

1. Require authenticated user via `ctx.auth.getUserIdentity()`; throw `"Not authenticated"` if missing.
2. Trim `draft`; throw `"Nothing to suggest"` if empty after trim.
3. Reject drafts over 2000 characters with a clear error.
4. Enforce per-user daily cap via `internal.suggestions.assertCanSuggest` (20 suggestions per UTC day).
5. Call OpenAI with a system prompt focused on **grammar and clarity only** — do not change meaning, tone drastically, or add new facts.
6. Model: `gpt-4o-mini` (cost-effective for v1).
7. On success, persist a usage row via `internal.suggestions.saveSuggestion` (`userId`, `model` only — no draft or suggestion text).
8. Return trimmed suggestion text, or throw a user-friendly error if the API fails (log details server-side).

**Persistence (`commentSuggestions` table)**

- One row per successful suggestion: `userId`, `model`.
- Used only for rate limiting (`countUserSuggestionsToday`); not exposed to the client.
- Rows older than 2 days are deleted by the daily `purgeExpired` cron (`convex/crons.ts`).

**System prompt (v1)**

> You improve comment text for grammar and clarity. Keep the same meaning and approximate length. Do not add new information. Return only the improved comment text with no quotes or explanation.

**Environment**

- `OPENAI_API_KEY` read from `process.env` (already set in Convex)

### Validators

Add to `convex/lib/validators.ts`:

- `suggestCommentArgsValidator = { draft: v.string() }`

Reuse `v.string()` for returns in the action definition.

## Frontend

### Changes: `src/components/CommentForm.tsx`

- Import `useAction` and `useQuery` from `convex/react`
- Wire `const suggestComment = useAction(api.ai.suggestComment)`
- Wire `const quota = useQuery(api.users.suggestionQuota, { dayStart })` (skip when signed out)
- Add state: `isSuggesting` (boolean)
- Add **"Suggest edit"** button:
  - Visible only inside `<Authenticated>` (same as form)
  - `type="button"` (does not submit form)
  - Disabled when `content.trim()` is empty, `isSuggesting` is true, or `quota.remaining === 0`
  - Placed between textarea and "Post Comment" button
- Show quota hint below the textarea when `quota` is loaded:
  - `{remaining} AI suggestion(s) remaining today` while under the cap
  - `Daily AI suggestion limit reached. Try again tomorrow.` when `remaining === 0`
- On click:
  1. Set `isSuggesting` true, clear error
  2. `await suggestComment({ draft: content.trim() })`
  3. On success: `setContent(result)`
  4. On failure: set error message (reuse existing error `<p>`)
  5. Finally: `isSuggesting` false

**Loading UX:** Button label becomes `"Suggesting…"` while pending.

## Dependencies

| Package  | Action                          |
|----------|---------------------------------|
| `openai` | Add via `pnpm add openai`       |

No new Astro, Clerk, or Convex client packages.

## Rate limiting (implemented)

Each signed-in user gets **20 AI suggestions per UTC calendar day** (`DAILY_SUGGESTION_LIMIT` in `convex/lib/rateLimit.ts`).

**Server enforcement**

- `convex/ai.ts` calls `internal.suggestions.assertCanSuggest` before the OpenAI request.
- `assertCanSuggest` (`convex/suggestions.ts`) uses `countUserSuggestionsToday` to count rows in `commentSuggestions` since `dayStart` (`getUtcDayStart`).
- When the cap is reached, the mutation throws `formatDailyLimitError()` (`Daily suggestion limit reached (20). Try again tomorrow.`).
- After a successful suggestion, `saveSuggestion` inserts a usage row so the count stays accurate.

**Client quota display**

- `api.users.suggestionQuota` (`convex/users.ts`) returns `{ used, limit, remaining }` via `suggestionQuotaValidator`.
- `CommentForm` passes the current UTC `dayStart`, shows remaining suggestions, and disables **Suggest edit** when `remaining === 0`.
- The action still re-checks the limit server-side; the query is for UX only.

## Security

- API key never exposed to browser or Astro env
- Action requires Clerk-authenticated identity
- Input length cap (2000 chars)
- Per-user daily suggestion cap (20 per UTC day)
- Generic error messages to client; `console.error` on server for debugging

## Out of scope (v1)

Per-user daily suggestion caps are **in scope and implemented** (see Rate limiting above). Still out of scope:

- Storing draft or suggestion text in the database
- `@convex-dev/agent` / chat threads
- Moderation or tone presets
- Streaming responses

## Testing plan

1. Sign in, type a rough draft, click **Suggest edit** — textarea updates with polished text
2. Edit suggestion manually, click **Post Comment** — comment appears in list
3. Sign out — suggest button not visible (inside Authenticated block)
4. Empty textarea — button disabled
5. Remove `OPENAI_API_KEY` temporarily — friendly error, no crash
6. Exceed daily suggestion limit — clear rate-limit error

## Files touched

| File | Change |
|------|--------|
| `convex/ai.ts` | New — Action |
| `convex/suggestions.ts` | Rate-limit check + usage persistence + purge |
| `convex/schema.ts` | `commentSuggestions` table |
| `convex/crons.ts` | Daily purge of expired usage rows |
| `convex/lib/rateLimit.ts` | Daily cap + retention constants |
| `convex/users.ts` | `suggestionQuota` query for UI |
| `convex/lib/validators.ts` | Add suggest args validator |
| `src/components/CommentForm.tsx` | Button + useAction |
| `package.json` | Add `openai` dependency |

# Design: AI Comment Suggest (Minimal)

**Date:** 2026-06-30  
**Status:** Awaiting review  
**Scope:** One `suggestComment` Convex Action + button in `CommentForm`

## Goal

Let signed-in users polish a comment draft with AI before posting. The suggestion improves grammar and clarity while preserving meaning and roughly similar length. No database writes from the Action — posting still uses the existing `comments.create` mutation.

## Context

- **Stack:** Astro 6 (hybrid SSR), React islands, Convex, Clerk, Cloudflare Workers
- **Existing UI:** `CommentForm.tsx` inside `Comments` island with `withConvexProvider`
- **Auth:** Clerk JWT validated by Convex (`convex/auth.config.ts`)
- **Prerequisite:** `OPENAI_API_KEY` set in Convex environment (dev + prod)

## Architecture

```
CommentForm (React island)
  └─ useAction(api.ai.suggestComment)
       └─ Convex Action (convex/ai.ts, "use node")
            ├─ ctx.auth.getUserIdentity() — require sign-in
            ├─ OpenAI chat.completions (gpt-4o-mini)
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
4. Call OpenAI with a system prompt focused on **grammar and clarity only** — do not change meaning, tone drastically, or add new facts.
5. Model: `gpt-4o-mini` (cost-effective for v1).
6. Return trimmed suggestion text, or throw a user-friendly error if the API fails (log details server-side).

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

- Import `useAction` from `convex/react`
- Wire `const suggestComment = useAction(api.ai.suggestComment)`
- Add state: `isSuggesting` (boolean)
- Add **"Suggest edit"** button:
  - Visible only inside `<Authenticated>` (same as form)
  - `type="button"` (does not submit form)
  - Disabled when `content.trim()` is empty or `isSuggesting` is true
  - Placed between textarea and "Post Comment" button
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

## Security

- API key never exposed to browser or Astro env
- Action requires Clerk-authenticated identity
- Input length cap (2000 chars)
- Generic error messages to client; `console.error` on server for debugging

## Out of scope (v1)

- Saving suggestions to the database
- Rate limiting (future: per-user daily cap)
- `@convex-dev/agent` / chat threads
- Moderation or tone presets
- Streaming responses

## Testing plan

1. Sign in, type a rough draft, click **Suggest edit** — textarea updates with polished text
2. Edit suggestion manually, click **Post Comment** — comment appears in list
3. Sign out — suggest button not visible (inside Authenticated block)
4. Empty textarea — button disabled
5. Remove `OPENAI_API_KEY` temporarily — friendly error, no crash

## Files touched

| File | Change |
|------|--------|
| `convex/ai.ts` | New — Action |
| `convex/lib/validators.ts` | Add suggest args validator |
| `src/components/CommentForm.tsx` | Button + useAction |
| `package.json` | Add `openai` dependency |

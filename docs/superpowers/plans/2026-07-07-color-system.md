# Color System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace indigo/gray hardcodes with a blue-violet + dark-orange semantic token system, ready for future dark mode.

**Architecture:** Tailwind v4 `@theme` tokens in `global.css` (light + `.dark` pairs) plus shared class helpers in `src/lib/ui.ts`. Components import helpers for repeated patterns or use semantic utilities directly.

**Tech Stack:** Astro 6, React, Tailwind CSS v4, `@source` scanning via `global.css`

**Design spec:** [docs/superpowers/specs/2026-07-07-color-system-design.md](../specs/2026-07-07-color-system-design.md)

---

### Task 1: Design tokens

**Files:**
- Modify: `src/styles/global.css`

- [x] Add `@custom-variant dark`
- [x] Define semantic `--color-*` tokens in `@theme`
- [x] Add `.dark` token overrides
- [x] Migrate `.tiptap` hex colors to `var(--color-*)`

### Task 2: Shared UI helpers

**Files:**
- Modify: `src/lib/ui.ts`

- [x] Export `accentButtonClass`, `secondaryButtonClass`, `ghostButtonClass`
- [x] Export `inputClass`, `linkClass`, `panelHighlightClass`
- [x] Remap `navLinkClass`, `navLinkActiveClass`, image classes to semantic tokens

### Task 3: Shell and navigation

**Files:**
- Modify: `src/layouts/Layout.astro`, `src/components/NavBar.astro`

- [x] Body uses `bg-surface text-text`
- [x] Header uses `border-border bg-surface`
- [x] Sign up → `accentButtonClass`; Sign in → `secondaryButtonClass`

### Task 4: Blog surfaces

**Files:**
- Modify: `BlogIndex.tsx`, `PostDetail.tsx`, `PostEditor.tsx`, `MarkdownContent.tsx`

- [x] Replace indigo/gray with semantic tokens and `ui.ts` helpers
- [x] Publish / New post → `accentButtonClass`

### Task 5: Comments and agent

**Files:**
- Modify: `CommentForm.tsx`, `CommentList.tsx`, `CommentAgentChat.tsx`, `AssistantApp.tsx`, `AgentChatPanel.tsx`, `AgentMessage.tsx`, `ThreadSidebar.tsx`

- [x] Coach panel → `panelHighlightClass`
- [x] Send / New chat (assistant) / Post comment → `accentButtonClass`
- [x] User chat bubbles → `bg-primary`

### Task 6: Static pages

**Files:**
- Modify: `about.astro`, `assistant.astro`

- [x] Headings and links use semantic tokens

### Task 7: Validation

- [x] `pnpm lint`
- [x] `pnpm build`
- [x] Grep `src/` for leftover `indigo-`, `gray-[0-9]`, `#4f46e5`
- [x] Manual visual smoke test in dev (user)

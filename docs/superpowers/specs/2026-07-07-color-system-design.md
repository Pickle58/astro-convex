# Color System Design Spec

Status: Approved for implementation (2026-07-07)

## Summary

Replace the default indigo/gray palette with a blueish-violet brand system and dark-orange accents. Colors live in Tailwind v4 `@theme` tokens with `.dark` pairs prepared for a future light/dark/system toggle. Shared class helpers in `src/lib/ui.ts` compose semantic utilities for repeated patterns.

Scope is **frontend-only** — no Convex, Clerk, or schema changes. No theme toggle UI in this pass.

## Decisions

| Decision | Choice |
|----------|--------|
| Accent role | **Option B** — orange on primary CTAs plus selective highlights; violet for links, nav, focus |
| Architecture | **Option C** — `@theme` tokens in `global.css` + shared helpers in `ui.ts` |

## Token palette

### Light mode (default)

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#5B52E8` | Links, focus rings, nav hover, user chat bubbles |
| `--color-primary-muted` | `#EEEAFF` | Nav active bg, coach panel bg |
| `--color-primary-border` | `#C4B5FD` | Nav active border, coach panel border |
| `--color-accent` | `#C2410C` | Primary CTAs |
| `--color-accent-hover` | `#9A3412` | CTA hover |
| `--color-surface` | `#FFFFFF` | Page bg, cards, inputs |
| `--color-surface-muted` | `#F7F6FF` | Empty states, toolbars |
| `--color-border` | `#E4E2F0` | Borders |
| `--color-text` | `#1E1B4B` | Headings, body |
| `--color-text-muted` | `#5B5878` | Meta, placeholders |

### Dark mode (tokens only — not enabled by default)

| Token | Value |
|-------|-------|
| `--color-surface` | `#12101F` |
| `--color-surface-muted` | `#1C1830` |
| `--color-border` | `#2E2850` |
| `--color-text` | `#F3F1FF` |
| `--color-text-muted` | `#A8A3C4` |
| `--color-primary` | `#8B83FF` |
| `--color-primary-muted` | `#2A2450` |
| `--color-primary-border` | `#4C4580` |
| `--color-accent` | `#EA580C` |
| `--color-accent-hover` | `#FB923C` |

## Accent placement

**Orange (`accentButtonClass`):** Sign up, Publish, Send, New chat, Submit comment, Apply suggestion.

**Violet (`navLinkActiveClass`, `panelHighlightClass`):** Nav active pill (with optional `ring-accent/30`), comment coach panel.

**Links:** `text-primary hover:text-primary/80` — never orange.

## `ui.ts` exports

- `accentButtonClass`, `secondaryButtonClass`, `ghostButtonClass`
- `navLinkClass`, `navLinkActiveClass`
- `panelHighlightClass`, `inputClass`, `linkClass`
- Image classes remapped to `border-border`

## Out of scope

- Theme toggle UI, localStorage, `prefers-color-scheme` wiring
- Clerk `<UserButton />` theming
- Logo `currentColor` dark-mode adaptation

# UI Polish Design Spec

Status: Approved for planning (2026-07-06)

## Summary

Polish the blog and site chrome with consistent image presentation (cover + inline) and upgraded navigation links. Images get a bounded display size, subtle border, and shadow. Nav links become pill-style buttons with hover motion and color transitions. Active route gets a distinct filled state.

Scope is **frontend-only** — no Convex or schema changes.

## Current state

| Area | Today |
|------|--------|
| **Nav** (`NavBar.astro`) | Plain text links; gray → darker gray on hover. Sign in/up already use button styling. |
| **Cover — post detail** (`PostDetail.tsx`) | `h-64 w-full object-cover`, rounded, no border/shadow. |
| **Cover — index cards** (`BlogIndex.tsx`) | `h-48 w-full object-cover` inside a card that already has border + shadow. |
| **Inline — article body** (`MarkdownContent.tsx`) | `max-w-full`, rounded, thin border, no shadow or max-height. |
| **Inline — editor** (`global.css` `.tiptap img`) | `max-width: 100%`, border, no shadow or max-height. |
| **Content width** | Blog pages use `max-w-3xl` (~48rem) main column. |

Large uploaded images can still dominate vertically (especially inline) because only width is capped.

## Requirements

1. **Cover and inline images** — limit to a reasonable on-screen size (not full viewport height).
2. **Image chrome** — consistent border + shadow treatment across read and edit surfaces.
3. **Nav links** — button-like appearance with hover animation (color + subtle motion).
4. **Consistency** — reuse shared styling; avoid copy-pasting long Tailwind strings in four places.

## Approaches considered

### Images

| Approach | Pros | Cons |
|----------|------|------|
| **A. Shared Tailwind strings in `src/lib/ui.ts`** | One source of truth; utilities scanned via `@source`; works in Astro + React | TipTap editor needs separate plain CSS in `global.css` |
| **B. React `BlogImage` component only** | Typed props (variant: cover \| inline) | Does not cover TipTap editor or Astro without duplication |
| **C. Repeat Tailwind in each file** | No new abstractions | Drifts immediately; already duplicated between MarkdownContent and `.tiptap img` |

**Recommendation: A (shipped)** — export class strings from `src/lib/ui.ts`; mirror inline limits in `.tiptap img` inside `global.css`.

### Navigation

| Approach | Pros | Cons |
|----------|------|------|
| **A. `NavLink.astro` component** | Active state from `Astro.url.pathname`; single style definition | One small new file |
| **B. Inline classes on each `<a>`** | Minimal files | Active logic duplicated three times |
| **C. React nav island** | Rich animations | SSR/auth complexity; overkill for three links |

**Recommendation: A (shipped)** — `NavLink.astro` with `href`, `label`, optional `matchBlog` (blog routes) and `matchPrefix` (section routes).

## Design

### Shared image styling (`src/lib/ui.ts` + `global.css`)

Export Tailwind class strings from `src/lib/ui.ts` and import them in React/Astro consumers. TipTap uses matching plain CSS on `.tiptap img` in `global.css` (editor cannot import TS modules).

#### `coverImageClass` (post detail hero)

- `max-w-2xl max-h-56`, centered, `object-cover`
- `rounded-xl border border-gray-200 shadow-lg`

#### `coverImageCardClass` (blog index thumbnails)

- `h-48 w-full object-cover` (card wrapper keeps outer border/shadow)

#### `contentImageClass` (inline markdown)

- `max-w-lg max-h-72`, `object-contain`, centered
- `rounded-xl border shadow-lg`, hover shadow/scale on read view

#### Editor parity

`.tiptap img` in `global.css` mirrors `contentImageClass` limits with plain CSS (max-width 32rem, max-height 18rem, border, shadow).

### Files to touch (images)

| File | Change |
|------|--------|
| `src/lib/ui.ts` | Export `coverImageClass`, `contentImageClass`, `coverImageCardClass`, `coverImagePreviewClass` |
| `src/styles/global.css` | `@source` directive; `.tiptap img` editor styling |
| `src/components/MarkdownContent.tsx` | `img` renderer → `contentImageClass` |
| `src/components/blog/PostDetail.tsx` | Cover `<img>` → `coverImageClass` |
| `src/components/blog/BlogIndex.tsx` | Card cover `<img>` → `coverImageCardClass` |
| `src/components/blog/PostEditor.tsx` | Cover preview → `coverImagePreviewClass` |

No upload-size limits on the backend — display-only constraints.

### Navigation (`NavLink.astro` + `src/lib/ui.ts`)

New component importing nav styles from `ui.ts`:

```astro
---
import { navLinkActiveClass, navLinkClass } from "../lib/ui.ts";

interface Props {
  href: string;
  label: string;
  matchBlog?: boolean;
  matchPrefix?: boolean;
}

const { href, label, matchBlog = false, matchPrefix = false } = Astro.props;
const path = Astro.url.pathname;

let isActive = false;
if (matchBlog) {
  isActive =
    path === "/" || path === "/blog" || path.startsWith("/blog/");
} else if (matchPrefix) {
  isActive = path === href || path.startsWith(href + "/");
} else {
  isActive = path === href;
}
---

<a
  href={href}
  class:list={[navLinkClass, isActive && navLinkActiveClass]}
  aria-current={isActive ? "page" : undefined}
>
  {label}
</a>
```

**Active matching rules:**

| Link | href | Active when |
|------|------|-------------|
| Blog | `/` | `pathname === '/'`, `pathname === '/blog'`, or `pathname.startsWith('/blog/')` |
| Assistant | `/assistant` | prefix match |
| About | `/about` | exact match |

Blog uses `matchBlog` (not prefix-only) so `/blog/*` routes highlight Blog without matching unrelated `/blog…` paths.

#### `navLinkClass` / `navLinkActiveClass` (`src/lib/ui.ts`)

Pill button matching existing indigo accent:

```css
/* navLinkClass — Tailwind utilities in ui.ts */
inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2
text-sm font-medium text-gray-700 shadow-sm
transition-all duration-300 ease-out
hover:-translate-y-1 hover:scale-[1.02] hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-lg
active:translate-y-0 active:scale-100
```

#### `navLinkActiveClass`

Distinct resting state (not only hover):

```css
/* navLinkActiveClass — Tailwind utilities in ui.ts */
border-indigo-500 bg-indigo-100 text-indigo-800 shadow-md ring-2 ring-indigo-200/80
```

No translate on active link (avoid “floating” current page).

### `NavBar.astro`

Replace three plain `<a>` tags with:

```astro
<NavLink href="/" label="Blog" matchBlog />
<NavLink href="/assistant" label="Assistant" matchPrefix />
<NavLink href="/about" label="About" />
```

Keep site title link and Clerk buttons unchanged (Sign up already indigo-filled; nav links stay outline style for hierarchy).

## Out of scope

- Lightbox / click-to-zoom
- Image upload size validation
- Redesign of comment cards, assistant UI, or blog typography
- Dark mode

## Testing (manual)

1. **Cover — detail:** Upload a very wide and a very tall cover; confirm max height ~224px (`max-h-56`), max width ~672px (`max-w-2xl`), border + shadow visible.
2. **Cover — index:** Card thumbnail still `h-48` crop.
3. **Inline:** Insert a tall screenshot in a post; confirm max-height ~288px (`max-h-72`), max-width ~512px (`max-w-lg`), centered, border + shadow.
4. **Editor:** Insert inline image in TipTap; preview matches read styling.
5. **Nav:** Hover each link — slight lift, indigo tint, shadow increase. On `/`, Blog active; on `/blog/new`, Blog active; on `/assistant`, Assistant active.
6. **Mobile:** Nav wraps without overflow; touch targets ≥44px height (py-1.5 + text may need `py-2` on small screens if audit fails).
7. `pnpm lint` and visual spot-check on `/`, `/blog/[slug]`, `/about`.

## Assumptions

- Existing indigo/gray palette stays; no rebrand.
- WYSIWYG editor should mirror read-mode inline image styling.
- Active nav state is in scope (natural companion to button-style links).

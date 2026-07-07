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
| **A. Shared CSS component classes in `global.css`** | One source of truth; works in Astro, React, and TipTap CSS; easy to tune | Slightly less “Tailwind-native” |
| **B. React `BlogImage` component only** | Typed props (variant: cover \| inline) | Does not cover TipTap editor or Astro without duplication |
| **C. Repeat Tailwind in each file** | No new abstractions | Drifts immediately; already duplicated between MarkdownContent and `.tiptap img` |

**Recommendation: A** — add `@layer components` classes in `global.css` and apply class names everywhere.

### Navigation

| Approach | Pros | Cons |
|----------|------|------|
| **A. `NavLink.astro` component** | Active state from `Astro.url.pathname`; single style definition | One small new file |
| **B. Inline classes on each `<a>`** | Minimal files | Active logic duplicated three times |
| **C. React nav island** | Rich animations | SSR/auth complexity; overkill for three links |

**Recommendation: A** — `NavLink.astro` with `href`, `label`, and optional `matchPrefix`.

## Design

### Shared image classes (`src/styles/global.css`)

Add under `@layer components`:

#### `.image-frame` (base)

Shared border, radius, shadow, and transition used by all variants:

- `rounded-xl`
- `border border-gray-200`
- `shadow-md`
- `transition-shadow duration-200`
- Optional `hover:shadow-lg` on read surfaces only (not editor)

#### `.cover-image` (post detail hero)

- Extends `.image-frame`
- `w-full max-h-72` (288px cap — readable hero without dominating mobile)
- `object-cover object-center`
- `my-6`

Rationale: `max-h-72` keeps wide banners cropped nicely; taller uploads don’t push content below the fold.

#### `.cover-image-card` (blog index thumbnails)

- Extends `.image-frame` (border on image; card wrapper keeps existing card shadow)
- `w-full h-48 object-cover` (keep current crop height)
- Top corners only rounded if inside overflow-hidden card — apply `rounded-t-xl` when image is first child

#### `.content-image` (inline markdown + editor)

- Extends `.image-frame`
- `max-w-full max-h-96` (384px height cap)
- `w-auto h-auto object-contain`
- `mx-auto block my-6` (centered when narrower than column)
- `hover:shadow-lg` on read view only

Rationale: `object-contain` preserves aspect ratio for tall screenshots; width still respects `max-w-3xl` column.

#### Editor parity

Update `.tiptap img` in `global.css` to use the same rules as `.content-image` (either duplicate the property block or apply class via TipTap `HTMLAttributes` — prefer matching CSS selectors `.tiptap img, .content-image` for one definition).

### Files to touch (images)

| File | Change |
|------|--------|
| `src/styles/global.css` | Add component classes; align `.tiptap img` |
| `src/components/MarkdownContent.tsx` | `img` renderer → `className="content-image"` |
| `src/components/blog/PostDetail.tsx` | Cover `<img>` → `className="cover-image"` |
| `src/components/blog/BlogIndex.tsx` | Card cover `<img>` → `className="cover-image-card"` |
| `src/components/blog/PostEditor.tsx` | Cover preview `<img>` → `cover-image` at smaller scale (optional `max-h-24` override for thumbnail preview only) |

No upload-size limits on the backend — display-only constraints.

### Navigation (`NavLink.astro`)

New component:

```astro
---
interface Props {
  href: string;
  label: string;
  /** When true, active if pathname starts with href (e.g. /blog). */
  matchPrefix?: boolean;
}
const { href, label, matchPrefix = false } = Astro.props;
const path = Astro.url.pathname;
const isActive = matchPrefix
  ? path === href || path.startsWith(href + "/")
  : path === href || (href !== "/" && path.startsWith(href));
---
<a
  href={href}
  class:list={["nav-link", { "nav-link-active": isActive }]}
  aria-current={isActive ? "page" : undefined}
>
  {label}
</a>
```

**Active matching rules:**

| Link | href | Active when |
|------|------|-------------|
| Blog | `/` | `pathname === '/'` OR `pathname.startsWith('/blog')` |
| Assistant | `/assistant` | prefix match |
| About | `/about` | exact match |

Blog uses `matchPrefix` with special case for `/` + `/blog/*` (implement in component logic).

#### `.nav-link` styles (`global.css`)

Pill button matching existing indigo accent:

```
inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-1.5
text-sm font-medium text-gray-600 shadow-sm
transition-all duration-200 ease-out
hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-md
active:translate-y-0 active:shadow-sm
```

#### `.nav-link-active`

Distinct resting state (not only hover):

```
border-indigo-400 bg-indigo-50 text-indigo-800 shadow-sm
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

1. **Cover — detail:** Upload a very wide and a very tall cover; confirm max height ~288px, border + shadow visible.
2. **Cover — index:** Card thumbnail still `h-48` crop with framed image.
3. **Inline:** Insert a tall screenshot in a post; confirm max-height ~384px, centered, border + shadow.
4. **Editor:** Insert inline image in TipTap; preview matches read styling.
5. **Nav:** Hover each link — slight lift, indigo tint, shadow increase. On `/`, Blog active; on `/blog/new`, Blog active; on `/assistant`, Assistant active.
6. **Mobile:** Nav wraps without overflow; touch targets ≥44px height (py-1.5 + text may need `py-2` on small screens if audit fails).
7. `pnpm lint` and visual spot-check on `/`, `/blog/[slug]`, `/about`.

## Assumptions

- Existing indigo/gray palette stays; no rebrand.
- WYSIWYG editor should mirror read-mode inline image styling.
- Active nav state is in scope (natural companion to button-style links).

# 🧑‍🚀 Convex w/ Astro, Clerk & React

An [Astro](https://docs.astro.build) + [Convex](https://convex.dev) + [Clerk](https://clerk.com) starter with React and Tailwind CSS v4, hybrid rendering, and Cloudflare Workers deployment.

## Requirements

- **Node.js 22.12+** (required by Astro 6 — see `.nvmrc`)
- Astro **6.x** (latest version compatible with `@clerk/astro`; Astro 7 is not yet supported by Clerk)

## Auth setup

1. Link Clerk to this project (if you have the Clerk CLI):

   ```sh
   clerk auth login
   clerk link
   clerk env pull
   ```

2. In the [Clerk Dashboard](https://dashboard.clerk.com/), enable sign-in methods:
   - Email
   - Google
   - GitHub

3. Activate the **Convex** integration in Clerk. Copy your **Frontend API URL** into `.env.local` as `CLERK_JWT_ISSUER_DOMAIN`.

4. Install dependencies and start both servers:

   ```sh
   pnpm install
   pnpm dev
   ```

## Rendering modes (hybrid)

This project uses Astro 6’s hybrid model:

| Route | Mode | Why |
|-------|------|-----|
| `/about` | **Static** (prerendered at build) | Fast, cacheable marketing/content |
| `/` | **SSR** (`prerender = false`) | Clerk nav auth state + Convex comments island |

In Astro 6, `output: "static"` is the hybrid default. Opt individual routes out with:

```astro
---
export const prerender = false;
---
```

## Architecture

- **Nav** (`NavBar.astro`) — Clerk Astro components (SSR on `/`, client auth on static pages)
- **Comments island** — `ConvexProviderWithClerk` in React
- **Convex** — `convex/auth.config.ts` validates Clerk JWTs

## Deploy to Cloudflare Workers

1. Build and preview locally:

   ```sh
   pnpm build
   pnpm preview
   ```

   Copy `.dev.vars.example` to `.dev.vars` for local Wrangler secrets (`CLERK_SECRET_KEY`).

2. Set production secrets and vars in Cloudflare:

   ```sh
   wrangler secret put CLERK_SECRET_KEY
   ```

   In the Cloudflare dashboard (or `wrangler.jsonc` vars), also set:

   - `PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CONVEX_URL`
   - `CLERK_JWT_ISSUER_DOMAIN` (Convex dashboard env for backend validation)

3. Deploy:

   ```sh
   pnpm deploy
   ```

4. Add your Cloudflare Workers URL to Clerk **Allowed origins** in the Dashboard.

## Using Astro with Convex

1. Run `npx convex dev` for the backend.
2. Wrap Convex React islands with `withConvexProvider` in `src/lib/convex.tsx`.
3. Add islands with `client:load` for interactive Convex components.
4. Use `useQuery` / `useMutation` and Convex auth helpers.

## 📚 Learn More

- [Convex Docs](https://docs.convex.dev)
- [Convex + Clerk](https://docs.convex.dev/auth/clerk)
- [Clerk Astro](https://clerk.com/docs/astro/getting-started/quickstart)
- [Astro on Cloudflare](https://docs.astro.build/en/guides/deploy/cloudflare/)
- [Astro on-demand rendering](https://docs.astro.build/en/guides/on-demand-rendering/)

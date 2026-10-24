---
name: se-performance
description: Performance rules for Security Exile (Next.js 16 on Cloudflare Workers via OpenNext). Use when adding pages, data fetching, client components, fonts, images or third-party scripts, choosing static vs dynamic rendering, or investigating slow pages, Core Web Vitals or bundle size.
---

# Performance

Stack: Next.js **16.3** App Router, React 19, OpenNext on Cloudflare Workers, D1, KV and R2. This Next version differs from training data, so read `node_modules/next/dist/docs/` before using an API (AGENTS.md).

## Budgets
- **LCP < 2.5s, INP < 200ms, CLS < 0.1** on a mid-range phone.
- Worker bundle: under **10 MiB gzipped**. Check with `npx wrangler deploy --dry-run --outdir <tmp>`; it was about 3.7 MiB in October 2026.
- Don't add a client dependency over about 30 KB gzipped without saying why.

## Rendering
- **Server Components by default.** Add `"use client"` only to the leaf that needs state, effects or browser APIs. Pass server data down as props.
- Pages that read the request, the DB per viewer, or the time call `await connection()` (the existing pattern in `src/app/events/page.tsx`). Static content stays static.
- Parallelize independent queries with `Promise.all` (see `src/app/w/[handle]/[slug]/page.tsx`).
- D1 caps bound parameters at 100. Chunk `IN (...)` lists with `chunk()` from `src/lib/writeups/queries.ts`.

## Loading
- Fonts only through `next/font` (self-hosted, `display: "swap"`). No external font CSS. The CSP `font-src 'self'` would block it anyway.
- Images: WebP or AVIF, explicit dimensions, `loading="lazy"` below the fold, and art-directed `<picture>` where crops differ.
- Heavy components (3D, editors, charts): `next/dynamic` + IntersectionObserver.
- No third-party scripts. Each one needs a CSP change and a reason.

## Caching
- Static assets in `public/` are served by Workers Assets; the proxy matcher skips `/assets/`.
- After mutations, `revalidatePath` exactly the affected paths (see the server actions).

## Verify
Run `npm run preview` (the real Workers runtime) and use the Playwright or Chrome DevTools performance and Lighthouse tools on the changed page. Report LCP, CLS and bundle delta in the PR.

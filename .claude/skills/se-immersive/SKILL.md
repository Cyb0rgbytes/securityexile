---
name: se-immersive
description: 3D, WebGL, shader and generative-visual rules for Security Exile. Use when adding or editing Three.js / React Three Fiber scenes, drei helpers, postprocessing, GLSL shaders, canvas or SVG generative backgrounds, 3D assets, or AI-powered interactive UX in this repo.
---

# Immersive

Installed: `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `postprocessing`. The Worker bundle limit is 10 MiB gzipped (Workers Paid). Heavy visuals must earn their bytes.

## Loading
- 3D is **client-only and lazy**: `next/dynamic(() => import(...), { ssr: false })`, mounted when visible (IntersectionObserver), never on the critical path of LCP.
- Render a static poster image (WebP) first. Swap in the canvas when it's ready.
- When `data-fx="low"` or `prefers-reduced-motion` is set, render the poster only. Don't start the render loop (see the se-motion skill).

## Rendering
- `frameloop="demand"` unless something animates continuously. Cap `dpr` at `[1, 1.75]`.
- Pause when off-screen or the tab is hidden.
- Dispose geometries, materials, textures and render targets on unmount. drei's `useGLTF.preload` only for the hero asset.
- Postprocessing: at most bloom plus one stylistic pass (grain, chromatic aberration). Each pass costs a full-screen draw.

## Assets
- glTF/GLB compressed with **Meshopt** (or Draco), and textures as **KTX2** where supported.
- Keep the hero model under about 1.5 MB.
- Assets in `public/assets/3d/`, served from the same origin (allowed by the CSP `default-src 'self'`).

## Shaders and generative art
- Grain, distortion and liquid effects belong in GLSL on the GPU, not in per-frame JS loops.
- Generative backgrounds (noise fields, SVG filters) seed from the session so each visit differs. Keep them behind the fx switch.

## AI-native UX
If an AI feature ships (for example the planned hint helper):
- stream responses;
- show skeleton or optimistic states;
- rate-limit with `hit()` (`src/lib/security/rate-limit.ts`);
- never put secrets in client code. Model calls stay in server actions or route handlers.

## Verify
Run `npx wrangler deploy --dry-run --outdir <tmp>` and keep the gzip total under 10 MiB. Then take a Playwright screenshot with fx full and fx low.

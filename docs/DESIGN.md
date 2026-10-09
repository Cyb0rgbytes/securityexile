# Security Exile: visual design ("cyber-shinobi")

Last updated: 2026-10-09. This redesign is on branch `design/cyber-shinobi` (commit `7402a72`). The branch was created from `phase-5-writeups`, so it also contains all of Phase 5. **It is not live yet.**

## Where we are

The site was redesigned from a generic "hacker" look (near-black, emerald, glitch effects, globe video) to a **cyber-shinobi** identity: a neon-noir mix of katana and terminal. The owner chose it over "ink & steel" and "night raid". Only visuals changed. Routes, data, auth, server actions and the writeup sanitizer are untouched.

Checks run on the branch:

- Typecheck: clean.
- Lint: 0 errors.
- Tests: 257/257 pass.
- `next build`: all routes build.
- Screenshots reviewed at 1440 and 390 widths: home, writeups library, writeup reader, sign-in (Clerk), mobile menu.
- With reduced motion, the site resolves to low FX: no rain canvas, no drift.

**Not yet verified:**

- `opennextjs-cloudflare build` failed because Windows held a lock on the `.open-next` folder (EPERM). This is environmental. Close any `wrangler` preview and rerun it.
- The events, teams, profile and war-room pages haven't been screenshotted in the new look. They re-skin through the shared tokens, so the change should carry over, but nobody has looked yet.
- Core flows haven't been clicked through on this branch: create a writeup draft, upvote/bookmark, open an event.

## Design system

### Colour (`src/app/globals.css`, `:root`)

The token **names** were kept from the old emerald theme, so roughly 30 pages re-skinned without markup changes. **The names no longer describe the colours:**

| Token | Value | Use |
|---|---|---|
| `bg` / `bg-deep` / `bg-raised` | `#070a12` / `#04060b` / `#0d1220` | Indigo night (aizome), not flat black |
| `fg` / `fg-muted` | `#ebe6da` / `#8f97ab` | Washi-paper text / steel mist |
| `green` / `green-bright` | `#22d3b4` / `#5ff5d8` | **Jade-teal: primary buttons, links, success** |
| `red` / `red-bright` | `#f2412e` / `#ff6a52` | **Shu vermilion: blade, hanko seal, danger, errors** |
| `cyan` | `#7fb2ff` | Steel blue, hairlines and code titles only |
| `line` / `line-strong` | steel 13% / teal 40% | Borders |

Teal and vermilion were sampled from the background art's neon signs. They also echo the crest's green and red. The Clerk theme in `src/lib/auth/appearance.ts` duplicates these values, so a palette change must be made there too.

### Type (`src/app/layout.tsx`, all self-hosted through `next/font`, CSP-safe)

| Role | Font | Utility |
|---|---|---|
| Headings, buttons, nav | Chakra Petch 500/600/700 | `font-display` |
| Body | IBM Plex Sans 400/500/600 | `font-sans` (default) |
| Code, terminals, small data labels | JetBrains Mono | `font-mono` |
| Kanji seals and marks | Shippori Mincho 800, not preloaded | `.kanji`, `.hanko` |

Google serves Shippori in unicode-range slices, so a visitor only downloads the slices holding the glyphs on the page. The build output has about 148 font files (about 4.5 MB), but each visit fetches only a few small ones.

### Shapes and utilities (`globals.css`)

- `notch`: blade-cut corners, top-right and bottom-left. `notch-sm` makes them smaller; `[--se-notch:22px]` overrides the size. Notched controls draw the focus ring *inside*, because clip-path clips outlines.
- `glint`: a steel sweep across a control on hover or focus.
- `edge-hover`: the border warms to vermilion on hover or focus-within.
- `.hanko`: a vermilion seal. `.kanji`: a kanji mark. Both live in `@layer components` so Tailwind utilities like `hidden` override them. Unlayered CSS beats utilities in Tailwind v4.
- `.slash-link`: a skewed underline that draws on hover and stays on `aria-current="page"`.
- `.signal`: a blade-edge divider with a travelling vermilion glint.
- Kept from before: `glass` (radius now 3px), `neon-border`, `bracketed`, `cursor-blink`, `.glitch` (only used on the 404 now), `.grain`.
- **Locked names:** `.term*` and `.hljs-*` are in the sanitizer allowlist (`src/lib/writeups/render.ts`) and its tests. Restyle them, never rename.

## Background

`src/components/fx/ShinobiBackdrop.tsx` replaced `BackgroundVideo`. The 11 MB globe video was deleted.

- **Art:** a rain-soaked rooftop at night, a shinobi silhouette with a katana, torii gates, and teal and vermilion neon.
  - Generated with Higgsfield `z_image` (3 drafts, 0.15 credits total). Draft 0 was used at its native 2048×1152.
  - Files: `public/assets/bg/shinobi-{1280,2048}.{avif,webp}`, plus a `shinobi-portrait.*` crop for tall phones. About 424 KB in total.
- **Layers:**
  1. The image with a slow drift (`.backdrop-img`).
  2. A kanji/katakana rain canvas. Full FX only, masked off the copy column, paused while the tab is hidden.
  3. Readability scrims. Desktop is dark on the left; phones are dark evenly.
  4. An extra `bg/80` scrim on every route except `/`, so long-form reading stays calm.
- **Tuning knobs** in the same file: `GLYPHS` (which characters fall), `SPAWN` (density), `FRAME_MS` (speed), `CELL` (spacing).

## Motion

- **The single orchestrated moment** is the home hero's katana slash:
  1. A light streak crosses the headline.
  2. The two diagonal halves snap together.
  3. The 忍 seal stamps in.
  - Classes: `.blade-a`, `.blade-b`, `.blade-streak`, `.hanko-stamp`.
- Everything else moves only in response to the user: button glint, nav slash, card edges.
- **Low FX and reduced motion** resolve everything to its static final state through the `[data-fx="low"]` rules and the `prefers-reduced-motion` block. Keep this when adding motion.
- three.js and framer-motion are in `package.json` but not imported anywhere. They were deliberately not used.

## Component map

| Area | Files | What changed |
|---|---|---|
| Shell | `layout.tsx`, `Header.tsx`, `NavLinks.tsx` (new), `Footer.tsx`, `AuthControls.tsx`, `FxToggle.tsx` | Wordmark plus 忍 seal; active-page slash nav; **new accessible mobile menu** (FX toggle inside it on phones); footer with 影 seal |
| Landing | `src/components/landing/*` | Hero with slash (stat strip removed); feature grid with one lead item and five compact ones, each with a kanji mark (書 技 組 戦 鍵 令); scabbard title bar on the terminal; the crest moved into the CTA panel |
| Shared UI | `NeonButton.tsx`, `CursorHeading.tsx` | Notch + glint buttons (same props); display-font headings with a mono prompt |
| Pages | `not-found.tsx`; titles in teams, profile, reader, comments, join, onboarding | 404 "Lost in the shadows."; page titles moved from mono to the display face. Small green mono section labels were kept on purpose. |
| Removed | `BackgroundVideo.tsx`, `FalconCrest.tsx`, `TypingText.tsx`, `scripts/encode-bg.sh`, `bg-*.mp4/webm`, `bg-poster.webp` | All recoverable from git history |

## Skills installed for design work

Installed at user scope and available from the next session:

- `ui-ux-pro-max`
- `taste-skill` (its `redesign-skill` checklist guided this pass)
- `frontend-design-pro`

Not installed:

- `blencorp/claude-code-kit`: a CLI kit with shell hooks, not a plugin.
- `bencium-controlled-ux-designer`: not on disk.
- The web-directory links: not installable.

## Next steps

1. Rerun `npx opennextjs-cloudflare build` (or `npm run preview`) once the `.open-next` lock is gone, and check the Worker size.
2. Screenshot the pages not yet reviewed: events board, event detail, war room, teams, team page, profile, writeup editor. Fix any outliers.
3. Click through the core flows on this branch.
4. Merge order: `phase-5-writeups` → `main` first (it has its own go-live steps in `SUMMARY.md`), then `design/cyber-shinobi`. Alternatively, merge the design branch alone, which brings Phase 5 with it.
5. Optional polish:
   - Run Lighthouse to check the image and font slices.
   - Personalise `GLYPHS`.
   - Consider a Higgsfield upscale or a second scene (e.g. a writeups or events header) if more art is wanted.
6. Phase 6 UI (dossier, ranks, Ctrl+K palette) should use this system: `font-display`, `notch`/`glint`, `.hanko`/`.kanji`, and teal for actions, vermilion for emphasis.

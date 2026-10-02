# Security Exile — progress log

Last updated: 2026-10-02. Spec lives in [`MD.md`](../MD.md).

## Status

| Phase | State | Commit |
|---|---|---|
| 1. Scaffold, design system, layout, landing | Done | `3be428b` |
| 1b. Rebrand around community crest + background loop, copy reframed | Done | `33cbb9a` |
| 2. Auth + DB schema | Done, verified end to end by the owner (first member: @darktemplar) | `7625885` + redirect fix |
| 3. Teams + invite codes + join requests | Next | |
| 4–7 | Not started | |

Code: https://github.com/Cyb0rgbytes/securityexile (branch `main`). Commits use the GitHub no-reply email `34769900+Cyb0rgbytes@users.noreply.github.com` (set in this repo's git config) because the account blocks pushes that expose a private address.

Runs locally with `npm run build && npm run start -- --port 3000`. Nothing is deployed. External resources that now exist: Cloudflare D1 `security-exile` (EU jurisdiction) and KV `security-exile` on "Omar1super@gmail.com's Account", and Clerk app `app_3K8IjbMWQcrUJGclBcRBlFMDTeu` (development instance only).

## Phase 2 — auth + database (2026-10-02)

**Database.** Drizzle schema in `src/lib/db/schema.ts`: 20 tables, ULID text keys, epoch-ms timestamps, enums as text + CHECK constraints, partial unique indexes for "one captain per team" and "one pending join request per user per team", foreign keys with cascade / set-null. Migration `drizzle/migrations/0000_married_catseye.sql` is applied **locally** and **remotely**. Constraint behaviour was tested by hand: second captain, bad role, 6-char tag, vote of 5 and dangling FK are all rejected. `getDb()` in `src/lib/db/client.ts` (server-only) binds Drizzle to `getCloudflareContext().env.DB`.

**Auth.** Clerk (`@clerk/nextjs` 7, Core 3: `<Show>` replaces `SignedIn/SignedOut`), linked to the owner's app via the Clerk CLI; keys live only in git-ignored `.env.local`. `src/proxy.ts` (Next 16's renamed middleware) gates `/onboarding` and `/settings`; real authorization is server-side in `requireMember()` (`src/lib/auth/member.ts`), which lazily upserts the `users` row on first sight (no webhooks needed locally). Branded `/sign-in` and `/sign-up`, header **sign in / join** buttons (client component so public pages stay static), `/onboarding` handle claim (Zod-validated, reserved words, one-time, DB unique constraint as backstop), and `/u/[handle]` dossier stub. Clerk telemetry is disabled. CSP allows `*.clerk.accounts.dev`, `img.clerk.com` and Cloudflare Turnstile.

**Verified:** typecheck, lint, 21 handle-validation tests, production build (landing and `/security` still static); signed-out `/onboarding` → sign-in redirect; unknown `/u/x` → 404; sign-in/up pages render branded, served by the linked app, with zero console errors or CSP violations; `clerk doctor` all green.

**End-to-end test (by the owner, by hand — automated sign-up is correctly stopped by Clerk's bot check):** Google sign-up succeeded, but the first run exposed a bug: the header's sign-in button passes the current page as `redirect_url`, and when an OAuth sign-in turns into a sign-up that overrode the "go to /onboarding" fallback, so the new member landed on `/` with no handle and no `users` row. Fixed by forcing new accounts to `/onboarding` (`forceRedirectUrl` on `<SignUp>`/`<SignUpButton>`, `signUpForceRedirectUrl` on `<SignIn>`/`<SignInButton>`) and adding a safety net: `/u/me` (avatar menu → "Your dossier") resolves to your profile or, without a handle, to onboarding. Re-tested via that path: `/u/me` → `/onboarding` → handle claimed → `/u/darktemplar`; the `users` row has handle, name and avatar.

**Gotchas learned**
- Wrangler keys the *local* D1 copy by `database_id`. Changing the ID (e.g. placeholder → real) silently gives `next dev` a fresh, empty database: re-run `npm run db:migrate:local`.
- Clerk Core 3 no longer auto-creates keys; `clerk init --accountless` makes a temporary app, and `clerk auth login` later *claims* it into your account as a separate app. The project is linked to the owner's own app; the claimed extra `security-exile` app (`app_3K8Fqv…`) can be deleted in the dashboard.
- `drizzle-kit` pulls an old esbuild flagged by `npm audit` (4 moderate). It's a local CLI only, never shipped; the suggested "fix" downgrades drizzle-kit, so it's left as is.
- The Clerk CLI is installed globally (`npm i -g clerk`, v3.4).

**Owner to-dos in the Clerk dashboard:** enable Discord (currently GitHub, Google, X are on), rename the app to "Security Exile", optionally delete the extra claimed app.

## What Security Exile is (corrected 2026-10-02)

A cybersecurity **learning community and knowledge base**: members publish and read writeups, walkthroughs and research notes; profiles track skills; teams act as study groups; the events board and war room let members practise together in external CTFs. CTFs are one activity, not the identity. Audience: students/beginners and working practitioners. The first landing copy framed it as a CTF platform; that was wrong and has been rewritten.

## What is built

**Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind v4, `@opennextjs/cloudflare` + Wrangler config (Workers target; `next-on-pages`/Pages is deprecated). three.js / R3F / framer-motion are installed but currently unused (kept for Phase 6 3D badges).

**Design system** (`src/app/globals.css`): tokens derived from the crest — near-black `#05070a`, emerald `#00c46a` (+ bright `#2bff9a`), signal red `#e8192c`, bone white `#f2efe9`. JetBrains Mono for headings/UI chrome/terminal, Space Grotesk for body. Utilities: `glass`, `neon-border`, `bracketed`, `cursor-blink`, `text-glow`; `.glitch` (red/green channel split on hover/focus or one-shot `glitch-boot`), `.crest-*` boot-up sequence, `.signal` divider pulse, `.live-dot`, `.grain`.

**FX system** (`src/lib/fx/`): `FxProvider` (useSyncExternalStore over localStorage + `prefers-reduced-motion`), a pre-paint inline script that stamps `data-fx="full|low"` on `<html>`, and an `FxToggle` (auto → low → full). Everything decorative resolves to a static state under `[data-fx="low"]`; reduced motion collapses all animation durations.

**Landing page** (`src/components/landing/`, `src/components/fx/`):
- `BackgroundVideo`: fixed full-viewport brand loop (globe) with poster-first paint, JS rendition pick (1080 ≥ 1024px, else 720), fade-in on `canplay`, pause on hidden tab, readability gradients. Poster only in low-FX.
- `FalconCrest`: the logo with a stepped scanline reveal, red/green mask-based channel slices during boot, breathing glow, idle micro-glitch every 9–11 s. CSS only.
- Hero (typed headline, one-shot glitch on line two), feature grid (6 bracketed glass cards), terminal demo (live chip, red spoiler-lock line), CTA band with crest watermark, `SignalDivider`s, terminal-style 404, `/security` disclosure stub.
- Header with falcon mark, sticky glass, Ctrl+K hint (palette not built yet). Favicon and Apple icon via `src/app/icon.png` / `apple-icon.png`.

**Security baseline** (`next.config.ts`): CSP (`default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`; `script-src` still allows `'unsafe-inline'` because App Router emits inline bootstrap scripts — nonce-based CSP is planned for Phase 7), HSTS, nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, COOP, `poweredByHeader: false`. `public/.well-known/security.txt` exists with placeholder domain/contact.

## Brand assets and pipeline

Raw originals live in `brand-src/` (git-ignored, large). Shipped derivatives are regenerated by scripts; `assets.json` is the manifest.

| Source | Script | Output |
|---|---|---|
| `brand-src/Logo.png` (1200×1280 transparent PNG) | `node scripts/brand-assets.mjs` | `public/assets/brand/falcon-{960,480,64}.webp`, `src/app/icon.png`, `src/app/apple-icon.png` |
| `brand-src/background.mp4` (5 s, 1080p, 10-bit HEVC, 42 Mbps, with audio) | `bash scripts/encode-bg.sh` (needs ffmpeg) | `public/assets/bg/bg-{1080,720}.{webm,mp4}` + `bg-poster.webp` — 10 s ping-pong loop, hue −40° toward brand green, 8-bit, silent; 1.4–4.7 MB each |

`public/assets/Logo.png` is a leftover copy of the original (unused by the site); safe to delete.

**Higgsfield:** one image generated (network-core hero poster, 0.25 credits), since retired when the crest became the hero; its prompt is kept in `assets.json`. Balance 2,999.75 of 3,000. Standing policy: drafts cheap, confirm before any video/3D/batch job, report spend after each run. Price checks done so far (`get_cost`, free): gpt_image_2_5 ≈ 0.25/image, recraft ≈ 1.25, seedance_2_0_mini 5 s 720p ≈ 5, hunyuan3d v3.1 std ≈ 7, meshy text-to-3D ≈ 25, seedance_2_5 5 s ≈ 35.

## Decisions worth remembering

- **Hero is the supplied crest over the supplied video**, not generated 3D. The code-built R3F network core from Phase 1 was removed because it fought the globe; three.js stays for Phase 6 badges.
- **Palette comes from the logo** (UAE-flag red/green/white/black), replacing the spec's neon green/cyan/magenta. Glitch channels are red/green for the same reason.
- **Video is hue-shifted to green at encode time**, not with a CSS filter, so it costs nothing at runtime.
- **Cloudflare target is Workers via OpenNext**, not Pages. D1/KV/R2 bindings are commented placeholders in `wrangler.jsonc` until Phase 2.
- **`body` is `background: transparent`; `html` owns the page colour.** An opaque body box paints over fixed `z-index: -1` children, which had silently hidden both the Phase 1 matrix rain and the first video pass.
- **DB schema plan** (for Phase 2, Drizzle on D1; text ULIDs, epoch-int timestamps): users, teams, team_members, join_requests, invite_codes (hash only + display prefix), invite_redemptions, audit_log, events, event_registrations, challenges, writeups, writeup_series, writeup_tags, comments, votes, bookmarks, badges, user_badges, xp_events, seasons. Full column list is in the Phase 1 plan at `C:\Users\Omar\.claude\plans\check-the-project-content-functional-rivest.md`.

## Verification performed

`npm run typecheck`, `npx eslint src`, `npm run build` all clean. Playwright checks at 1440×900 and 400×860: hero renders, video plays (currentTime advances) and picks the right rendition, no horizontal overflow, low-FX toggle removes video/crest animation/pulses and persists, reduced-motion + "auto" resolves to low, 404 route returns 404, security headers present via `curl -I`, zero console errors (the only warning was a preload hint, since fixed). Lighthouse has not been run yet.

## Known gaps / TODO

- `resolveFxLevel()` in `src/lib/fx/resolve.ts` is a placeholder policy (only honours the toggle and reduced motion). Open question for the owner: should explicit "full" beat OS reduced-motion; should low-memory devices / narrow phones default to low; should missing WebGL force low.
- Hero stat strip shows "—" until real counts exist (Phase 2+).
- `security.txt` and the disclosure page use placeholder domain/contact.
- Nav and button targets (`/writeups`, `/teams`, `/events`, `/leaderboard`, `/sign-in`) 404 until their phases land.
- CSP keeps `'unsafe-inline'` for scripts until the Phase 7 nonce pass.
- Git warns about LF→CRLF on every commit; add a `.gitattributes` (`* text=auto eol=lf`) when convenient.
- `public/assets/Logo.png` duplicate can be removed.

## Next: Phase 3 (teams, invite codes, join requests)

Team creation (name, 2–5 char tag, logo, bio, focus categories, join mode), roles and captaincy transfer, kick/leave; private and public invite codes (`TEAM-XXXX-XXXX`, hash-only storage, expiry, max uses, revocation, every redemption logged, KV rate limits per user and IP); join requests with approve/reject; audit log for captain actions. Planned Higgsfield spend: default team emblem set, about 2–10 credits, shown before generating. Team logo *uploads* need R2, which is a separate approval (R2 bucket not created yet).

## How to run

```bash
npm install
npm run dev                     # dev server (default :3000)
npm run build && npm run start  # production build, local
npm run typecheck && npm run lint
node scripts/brand-assets.mjs   # regenerate logo derivatives
bash scripts/encode-bg.sh       # regenerate background loops (ffmpeg)
npm run preview                 # OpenNext build + wrangler preview (not yet exercised)
```

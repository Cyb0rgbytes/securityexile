# Security Exile — what's been achieved (as of 2026-10-24)

Security Exile is a cybersecurity learning community and knowledge base: teams, events, writeups and profiles. The CTF arena (challenges, flags) and the labs are planned as separate, linked products on their own subdomains.

Live site: **https://app.securityexile.com** (`securityexile.com` still redirects there; see "Apex split" below).
Code: https://github.com/Cyb0rgbytes/securityexile. Detailed log: [`docs/PROGRESS.md`](PROGRESS.md). Roadmap: the Build Plan tracker (six stages, 69 tasks).

## What's live

| Phase | What it delivered | Status |
|---|---|---|
| 1. Look and feel | Next.js 16 site, dark design around the falcon crest, glitch effects, landing page | Live |
| 1c. Redesign: "cyber-shinobi" | New palette and fonts, rooftop-shinobi backdrop, katana-slash hero, kanji seals, mobile menu. See [`docs/DESIGN.md`](DESIGN.md) | Live |
| 2. Accounts | Clerk sign-in, member handles, database (Cloudflare D1, 20 tables) | Live |
| 3. Teams | Create and manage teams, roles, invite codes (stored hashed), join requests, audit log, emblems | Live |
| 4. Events and war room | Events board, team registration and rosters, private war room with challenge claiming, notes, auto-refresh, moderator hiding | Live |
| 5. Writeups | Markdown editor with preview and templates, image uploads, spoiler lock while an event runs, upvotes, hearts, bookmarks, threaded comments, library with search and filters | Live |
| Stage 1 foundations | Bilingual landing (`/`, `/ar`), Terms/AUP and Privacy drafts in both languages, `ctf.`/`labs.` holding pages, domain runbook | Live |
| 6. Profiles and gamification | XP, ranks, badges, leaderboards, Ctrl+K command palette, easter eggs | Next |

## Infrastructure in place

- **Cloudflare Workers (paid plan)**, deployed automatically when `main` is pushed. Worker 3.69 MiB gzipped of the 10 MiB limit.
- **Cloudflare D1** (migrations `0000`–`0004`, all applied remotely) and **KV** for rate limits. Workers Logs are on.
- **R2** bucket `security-exile-uploads` behind `files.securityexile.com`, with its own `nosniff` / `default-src 'none'` header rule.
- **Custom domains:** `app.`, `ctf.`, `labs.`, plus a redirect from the bare domain. DNSSEC is active on the zone.
- **GitHub:** CI checks (typecheck, lint, tests), `CODEOWNERS`, `CONTRIBUTING.md`.
- **Tests:** 289 automated tests, all passing.

## Security decisions worth remembering

- **No admin page and no bans.** Moderators can only hide events, writeups and comments. Roles are set only with a reviewed database command.
- **Server-side checks everywhere.** Every action checks permissions on the server and validates all input. Anything a visitor can't see returns 404.
- **Database changes are additive only.** This protects live data on D1.
- **Writeups are safe to display.** Markdown is cleaned when saved; raw HTML is shown as text and never run. Images are allowed only from our own files domain.
- **Uploads are checked.** File type is read from the file's actual bytes, photo location data is stripped, and size, rate and storage limits apply.
- **Language is set on `<html>`.** `src/proxy.ts` derives it from the path and the root layout applies `lang`/`dir`, so Arabic pages are correctly announced and mirrored.

## Apex split — on since 2026-10-26

`HOST_SPLIT` in `wrangler.jsonc` is `"on"`: the bilingual landing and the policy pages live on `securityexile.com`, and everything else 308s to `app.securityexile.com` (`docs/DOMAINS.md` Phase 3). Clerk runs on its production instance, so both hosts share one session. Turning the split off again needs the Cloudflare redirect rule `securityexile.com → app.securityexile.com` back first, or the apex serves the whole app.

## Open items

- **Clerk is still a development instance in production** (`*.clerk.accounts.dev`). Production keys and the `accounts.` subdomain are `docs/DOMAINS.md` Phase 2.
- **Branch protection on `main` is still off.** Nothing stops a direct push to the branch that auto-deploys.
- **No CAA records** on the zone, though DNSSEC is active.
- **Legal review pending** on the Terms/AUP and Privacy drafts; both pages carry a visible "under review" note, so Build Plan p1-06 and p1-07 stay open.
- **Network separation (p1-02) should be settled before any server is bought.** Layout in [`docs/STAGE-1-RUNBOOK.md`](STAGE-1-RUNBOOK.md).
- **Arena platform decision postponed:** self-hosted GZ::CTF or CTFd. A local comparison trial is planned.
- **Phase 3 test still pending:** redeeming an invite code from a second account.
- **Ten minor Phase 5 review findings were deferred** — listed in that branch's review notes (e.g. a repeated search parameter causing an error, comment counts including deleted comments).
- **Visual RTL check outstanding:** the Arabic pages are verified by markup, but no screenshots yet — the local Clerk dev key in `.dev.vars` is stale, which makes any browser hit on `npm run preview` fail the Clerk handshake.
- **Clerk dashboard tasks:** enable Discord sign-in and rename the app to "Security Exile".

## Known quirk

The **"Workers Builds: securityexile" check fails on every branch and PR commit** but succeeds on `main`. It appears to be configured for the production branch only. Judge PRs on the GitHub Actions `check` run instead; a failure on `main` would be the real signal.

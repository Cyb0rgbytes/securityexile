# Phase 5 — Writeups

Date: 2026-10-02 · Status: approved in chat, awaiting spec review

## Goal
Let members publish writeups, walkthroughs and research notes that the community can find, read, upvote, bookmark and discuss, with screenshots, highlighted code and terminal blocks, and without spoiling events that are still running.

## Owner decisions
- **Publishing:** any member with a handle publishes immediately (rate-limited). Moderators can hide afterwards. No review queue, no admin page (standing rule: no privileged web surfaces beyond narrow moderator hides).
- **Images:** uploaded to Cloudflare R2, served from `files.securityexile.com`. Creating the bucket and the custom domain needs an explicit owner "yes" at build time.
- **Spoiler lock:** while a linked event is running, a writeup is visible only to its author and the author's team. It goes public automatically when the event ends.
- **Voting:** upvotes only.
- **Rendering:** Markdown is rendered and sanitized on the server when the author saves; the safe HTML is stored and served as is.
- Cloudflare Workers Paid is in place (10 MiB Worker limit).

## Data model — migration `0003` (schema change, approved)
Additive only (`ALTER TABLE … ADD COLUMN`, `CREATE TABLE`, `CREATE INDEX`); no table rebuilds (see Phase 4: drizzle-kit rebuilds would fire cascades on D1).

| Table | Change |
|---|---|
| `writeups` | add `body_html` text not null default `''`; `hidden_at` timestamp; `vote_count` integer not null default 0; `comment_count` integer not null default 0; index on (`published_at`, `vote_count`) |
| `comments` | add `edited_at` timestamp; `hidden_at` timestamp; `body_html` text not null default `''` |
| new `uploads` | `id` (ULID, also the R2 key stem), `owner_id` → users (cascade), `writeup_id` → writeups (set null), `r2_key` unique, `mime` CHECK in (`image/png`,`image/jpeg`,`image/webp`,`image/gif`), `bytes` integer > 0, `created_at`; index on (`owner_id`, `created_at`) |

`votes` keeps its existing CHECK; the app only writes `value = 1`. `writeups.score` holds the trending score. The `team_id` on a writeup is set only when the author ticks "post as part of my team", and only to the author's current team.

## Visibility (single function, `src/lib/writeups/visibility.ts`)
`canRead(writeup, viewer, now)`:
- Hidden (`hidden_at` set): moderators/admins and the author only.
- Draft (`published_at` null): the author only.
- Spoiler-locked (`spoiler_until > now`): the author and members of `writeup.team_id`; if `team_id` is null, the author only.
- Otherwise public.

Every list (library, tag/category filters, search, profile, series, event page, bookmarks, sitemap) filters through a SQL form of the same rule (`publicWriteupsWhere(now)` plus an explicit author/team/staff widening where the viewer qualifies). Anything a viewer can't read returns 404.

`spoiler_until` is set on save: if `event_id` is set and the event hasn't ended, `spoiler_until = events.ends_at`, else null. When an event's end moves (Phase 4 edit), its writeups' `spoiler_until` is updated in the same batch.

## Permissions (server-side, `src/lib/writeups/permissions.ts`)
| Action | Who | Limits |
|---|---|---|
| Create / save draft | any member with a handle | body ≤ 100 KB, title 3–120 chars, ≤ 5 tags (each `[a-z0-9-]{2,24}`) |
| Publish | the author | 5 per day per member |
| Edit | the author (re-renders) | — |
| Delete | the author (cascade removes comments, votes, bookmarks; uploads unlinked and later swept) | — |
| Upvote / remove upvote | any member except the author; only readable writeups | 60 vote+bookmark actions per hour |
| Bookmark | any member; only readable writeups | (shared limit above) |
| Comment / reply | any member; only readable writeups; max depth 3 | 20 per hour; body ≤ 5 000 chars |
| Edit comment | its author, within 15 minutes | — |
| Delete comment | its author (soft: shows "[deleted]") | — |
| Hide / unhide writeup or comment | moderator or admin | audit log |
| Upload image | any member | 20 per hour; ≤ 5 MB each; ≤ 100 MB total per member |

## Rendering pipeline (`src/lib/writeups/render.ts`)
`remark-parse` → `remark-gfm` → `remark-rehype` (raw HTML **not** allowed: escaped as text) → custom terminal-block plugin → `rehype-sanitize` (allow-list schema) → `rehype-highlight` (common languages only) → heading ids + table of contents → `rehype-stringify`.

- Links: `http`, `https`, `mailto` only; external links get `rel="nofollow noopener noreferrer"` and `target="_blank"`.
- Images: `src` must start with `https://files.securityexile.com/`; anything else is replaced by its alt text.
- Fenced block with language `terminal`: lines starting with `$ ` render as commands with a green prompt; other lines as dimmed output.
- Comments use the same pipeline with a smaller allow-list (no images, no headings, no tables).
- The renderer is pure and deterministic; `body_html` is regenerated on every save. A script (`scripts/rerender-writeups.mjs`) re-renders all rows if the rules change.

## Uploads (`src/lib/uploads/*`, route `POST /api/uploads`)
- Auth: `requireMember`; rate limit and per-member quota checked before reading the body.
- Size check from `Content-Length` and while streaming; reject over 5 MB.
- Type check by magic bytes (PNG, JPEG, WebP, GIF); the declared type and file name are ignored.
- JPEG: APP1 (EXIF/XMP) segments removed before storing (strips GPS).
- Stored in R2 binding `UPLOADS` under `u/<ownerId>/<ulid>.<ext>` with `content-type` set from the detected type.
- Served from `files.securityexile.com` (R2 custom domain) with `X-Content-Type-Options: nosniff`, `Content-Disposition: inline`, `Cache-Control: public, max-age=31536000, immutable`, and a `Content-Security-Policy: default-src 'none'` response header (set via an R2/zone transform rule).
- The site CSP `img-src` becomes `'self' data: blob: https://img.clerk.com https://files.securityexile.com`.
- Orphan sweep: uploads with no `writeup_id` older than 7 days can be listed and deleted with `scripts/sweep-uploads.mjs` (manual, reviewed; no web endpoint).

## Ranking
- **Trending:** `score = vote_count / (hours_since_publish + 2)^1.5`, recomputed when votes change and by the library query for display ordering.
- **Newest:** `published_at desc`. **Top:** `vote_count desc` (all time).
- Vote changes run as one batch: insert/delete the vote and update `vote_count` from `count(*)`, so double-clicks or races can't drift the counter.

## Pages
| Route | Content |
|---|---|
| `/writeups` | trending / newest / top tabs; filters: category, level, tag; title + tag search; cards (title, author, team emblem, level, read time, upvotes, comments). Replaces the placeholder. |
| `/writeups/new`, `/writeups/[id]/edit` | editor (members only; edit = author only) |
| `/w/[handle]/[slug]` | reading page |
| `/w/[handle]/series/[slug]` | series index; reading pages show previous / next |
| `/me/writeups`, `/me/bookmarks` | own drafts + published; saved writeups |
| `/u/[handle]` | adds the member's published, readable writeups |
| `/events/[slug]` | adds "writeups for this event" (only readable ones, so empty while locked for outsiders) |

### Editor
- Write | Preview tabs (side by side on wide screens). Preview calls a server action that runs the same renderer.
- Fields: title, category (focus list), level (`DIFFICULTIES`), tags, optional event (events the author can see), optional series (create inline) + order, "post as part of my team".
- Templates: **CTF challenge writeup**, **walkthrough**, **research note** (starter Markdown in `src/lib/writeups/templates.ts`).
- Paste or drop an image → upload → insert `![alt](https://files.securityexile.com/...)`; progress and errors shown inline.
- Save draft / Publish / Unpublish. Local autosave of the draft to `localStorage` every 5 s (per writeup id or `new`), cleared after a successful server save; a "restore unsaved draft" prompt if a newer local copy exists.
- Controlled inputs throughout (React resets uncontrolled fields after actions).

### Reading page
- Stored HTML, table of contents for writeups with ≥ 3 headings, read time (≈ 200 wpm).
- Upvote (toggle), bookmark (toggle), copy link. Author: edit, unpublish, delete. Moderator: hide.
- Spoiler-locked view (author/team): red banner with a countdown to the event end.
- Comments: threaded to depth 3, Markdown via the comment pipeline, "edited" and "[deleted]" markers; posting re-renders the page (no live updates).

## Audit
Writeup publish/unpublish/delete and moderator hide/unhide (writeups and comments) write `audit_log` rows (team id = the writeup's team or null).

## Testing
- Vitest: sanitizer XSS corpus (script, event handlers, `javascript:`/`data:` URLs, raw HTML, foreign image hosts, nested Markdown tricks), terminal blocks, heading ids/TOC; visibility rule matrix (draft/hidden/locked/public × author/teammate/outsider/moderator); permissions; validation; upload sniffing (spoofed extension, polyglot header, oversize, EXIF strip leaves a valid JPEG); trending formula.
- DB checks: vote double-insert counted once; spoiler_until follows an event end change.
- Browser: write → preview → publish; paste image; locked writeup invisible to outsiders everywhere it could appear; comments/threads/edit window; moderator hide; phone width.
- Worker size measured after build (limit 10 MiB on Workers Paid).

## Out of scope
Full-text search, notifications/email, XP for writeups (Phase 6), live comment updates, review queue, image re-encoding/resizing, editing others' writeups (co-authors).

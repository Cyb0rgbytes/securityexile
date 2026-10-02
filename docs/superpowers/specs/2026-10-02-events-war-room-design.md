# Phase 4 — Events board and war room

Date: 2026-10-02 · Status: approved in chat, awaiting spec review

## Goal
Give the community one place to see upcoming CTFs and community events, let teams register for CTFs, and give each registered team a private war room to coordinate challenges during the event.

## Owner decisions
- **Who adds events:** any team's captain or co-captain (not staff-only).
- **War room liveness:** auto-refresh about every 10 s; no real-time connection.
- **War room access:** every member of a registered team. The roster is only a label for who's playing.
- **Event kinds:** CTFs (registration + war room) and community events (workshops, talks, study sessions; details only).

## Data model — migration `0002` (schema change, approved)
Additive only. The live D1 has no events yet.

| Table | Change |
|---|---|
| `events` | add `kind` text not null default `'ctf'`, CHECK in (`ctf`,`community`); `description` text (≤ 2000 chars, plain text); `created_by` → users (set null); `owner_team_id` → teams (set null); `hidden_at` timestamp |
| `event_registrations` | add `notes_md` text (≤ 20 000 chars); `notes_updated_at` timestamp |
| `challenges` | add `created_by` → users (set null); unique index on (`event_id`, `team_id`, lower(`name`)) |
| `users` | add `platform_role` text not null default `'member'`, CHECK in (`member`,`moderator`,`admin`) |

New enums in `src/lib/db/enums.ts`: `EVENT_KINDS = ["ctf", "community"]`, `PLATFORM_ROLES = ["member", "moderator", "admin"]`.

## Platform roles (narrow, no admin surface)
Owner decision (2026-10-02): **no `/admin` page, no in-app role management, no bans.** An admin surface becomes a target, and any vulnerability elsewhere would turn into full control.
- **moderator / admin:** the only in-app power is hiding / unhiding events (spam, fake events). Later phases may add hiding writeups and comments, each needing approval.
- Roles are assigned **only** with a reviewed `wrangler d1 execute --remote` command, with owner approval each time. No web endpoint can change a role.
- This replaces the `STAFF_USER_IDS` variable from the first draft.

## Arena link
The CTFd arena is a separate product on its own subdomain (planned: `arena.securityexile.com`). Events whose `url` points to that host show a "Security Exile Arena" badge; this is derived from the URL, with no extra column. Single sign-on and pulling arena scores back are future work.

## Timing (pure functions, `src/lib/events/timing.ts`)
- `phase(event, now)`: `upcoming` if now < starts_at, `live` if starts_at ≤ now < ends_at, otherwise `past`.
- `warRoomWritable(event, now)`: now < ends_at + 24 h.
- `registrationOpen(event, now)`: kind is `ctf` and now < ends_at.
- Times are stored in UTC ms and rendered in the viewer's timezone by a small client component.

## Permissions (server-side, `src/lib/events/permissions.ts`)
| Action | Allowed |
|---|---|
| Create event | captain / co-captain of any team; rate limit 3/day per member |
| Edit event | captain / co-captain of `owner_team_id`. Before start: all fields. After start: only `ends_at` (later only) and `url`. |
| Delete event | owner team captain / co-captain, only before start and with no other team registered |
| Hide / unhide event | moderator or admin |
| Register / unregister team | captain / co-captain, while `registrationOpen` |
| Set roster | captain / co-captain; roster ⊆ current team members |
| View war room | any member of a registered team; everyone else gets 404 |
| Add / edit / claim / move / delete challenge, edit notes | any member of that team, while `warRoomWritable` |
| Release someone else's claim | captain / co-captain; members can release only their own |

Hidden events are excluded from the board and return 404 except to moderators, admins and the owner team.

## Challenge state machine
`open → claimed → solving → solved`, plus `release` (claimed/solving → open) and `reopen` (solved → open).
- **claim:** `UPDATE challenges SET status='claimed', claimed_by=? WHERE id=? AND team_id=? AND status='open'`. Zero rows changed means someone else got there first; the UI shows "already claimed by @x".
- **solving / solved:** only the claimer, or captain / co-captain. Solved sets `solved_at`.
- Transitions are validated by a pure `canTransition(from, to, actorIsClaimer, actorIsLead)`.

## Validation (Zod)
- Event: title 3–80 chars; slug derived from the title, unique, with a suffix if taken; format ≤ 30 chars; url http(s) only; starts_at in the future when created; ends_at > starts_at; duration ≤ 14 days; description ≤ 2000 chars.
- Challenge: name 1–60 chars; category from the Phase 3 focus list; points 0–10 000; notes ≤ 10 000 chars; links ≤ 10, each label ≤ 40 chars and url http(s) only.
- Team notes ≤ 20 000 chars. Save sends the `notes_updated_at` it loaded; if the stored value is newer, the save is refused with "a teammate edited these notes — reload to see their changes".

## Markdown
Notes render with `marked`, are sanitized with DOMPurify (isomorphic, server-side), and links get `rel="noopener noreferrer nofollow"`. Raw HTML is stripped. If bundle size requires it, swap for a lighter renderer with the same sanitize step.

## Pages
| Route | Content |
|---|---|
| `/events` | live / upcoming / past tabs, kind filter, cards (title, kind, format, local times + countdown, team count, organizer emblem). Replaces the placeholder. |
| `/events/new` | create form (captain / co-captain) |
| `/events/[slug]` | public page: description, link, times, registered teams; role-dependent actions (register/unregister, roster, open war room, edit/delete, staff hide) |
| `/events/[slug]/edit` | owner team only |
| `/events/[slug]/war-room` | team members of a registered team only (404 otherwise) |

### War room
- Header: event, phase badge, countdown, team, players, solved count and points total.
- Board: columns open / claimed / solving / solved, category filter; tabs on narrow screens.
- Card: name, category, points, claimer, quick actions. A drawer holds the challenge notes and links.
- Team notes panel with the stale-save check above.
- `AutoRefresh` client component: `router.refresh()` every 10 s while the tab is visible and the room is writable; skipped while a text field has focus.
- Read-only banner once `warRoomWritable` is false.

## Rate limits (KV, existing helper)
- Event creation: 3/day per member.
- Challenge creation: 60/hour per member.
- War room writes (claim, move, notes): 300/hour per member.

## Audit
Event create / edit / delete / hide, and team register / unregister / roster changes, write `audit_log` rows. Challenge moves are not audited; they're high-volume and team-private.

## Engineering workflow (from the Guidance plan)
- **CI:** a GitHub Actions workflow runs typecheck, lint, tests and the OpenNext build on every push and pull request.
- **Branches:** pushing to `main` deploys to production, so work goes on a branch with a pull request. Cloudflare Workers Builds turns non-`main` branches into preview versions with their own URL. Owner action: protect `main` in GitHub (require a PR and passing CI).
- **Contributors:** add `CONTRIBUTING.md` (setup, branch / PR flow, security rules, never commit secrets) and `CODEOWNERS` so the owner reviews every change. This follows the plan's "keep contributors small and vetted".
- **Observability:** turn on Workers Logs (`"observability": { "enabled": true }` in `wrangler.jsonc`, included in the free plan) so errors can be read in the dashboard without `wrangler tail`.

## Testing
- Vitest: timing, permissions matrix, challenge transitions, Zod schemas, slug generation.
- DB check: concurrent claims → exactly one succeeds; unique challenge name per team per event.
- Browser: create event, register, roster, war room flow with seeded teammates (extend `scripts/seed-dev.mjs`), read-only after the grace window, 404 for outsiders.
- Measure Worker gzip size; stop and ask if it exceeds 3 MiB.

## Out of scope
- Writeups and spoiler lock (Phase 5). The Guidance plan adds official writeup templates, as Hack The Box publishes; noted for Phase 5.
- XP for solves (Phase 6).
- CTFtime import, email reminders, real-time sync.
- Anything the CTFd arena owns: challenge hosting, flag validation, dynamic scoring, first blood, labs and VPN.
- Arena single sign-on and score sync.
- Any admin panel, in-app role management or bans (rejected by the owner; abuse monitoring uses Cloudflare logs and the database directly).

# Phase 4 — Events Board & War Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the events board (CTF + community events added by team captains), team registration with rosters, a private auto-refreshing war room per registered team, platform roles (moderator/admin) with a small `/admin` page and bans, plus CI, contributor docs and Workers Logs.

**Architecture:** Server components read through query helpers in `src/lib/events/*`; every mutation is a server action that runs `requireMember → load rows → pure permission check → Zod → write (+ audit row in the same db.batch) → revalidatePath`, the same pattern as `src/app/teams/actions.ts`. Pure logic (timing, permissions, challenge transitions, validation) lives in small files with Vitest tests. The war room refreshes with `router.refresh()` every 10 s; correctness under races comes from conditional `UPDATE … WHERE status = ?` statements, not from the client.

**Tech Stack:** Next.js 16.3 App Router (Turbopack, `proxy.ts`, React 19.2), TypeScript, Tailwind v4, Drizzle ORM 0.45 on Cloudflare D1, KV rate limits, Clerk 7.9, Zod 4, Vitest 5, `marked` + `dompurify` (browser-only), OpenNext Cloudflare 1.20.

**Spec:** `docs/superpowers/specs/2026-10-02-events-war-room-design.md`

## Global Constraints

- Read `node_modules/next/dist/docs/` for any Next.js API you're unsure of (AGENTS.md); this Next version differs from training data.
- Every mutating server action: `requireMember()` first; never trust ids/roles from the client for authorization.
- Zod on every input; Drizzle query builder only (no string-built SQL with user input).
- Event: title 3–80 chars; format ≤ 30; url http(s) only; description ≤ 2000; starts in the future when created; ends after start; duration ≤ 14 days.
- Challenge: name 1–60; category from `FOCUS_CATEGORIES`; points 0–10 000; notes ≤ 10 000; links ≤ 10, label ≤ 40, url http(s) only. Team notes ≤ 20 000.
- War room writable until `ends_at + 24 h`; read-only after.
- Rate limits: event create 3/day/member; challenge create 60/hour/member; war-room writes 300/hour/member.
- War room for non-members of a registered team → `notFound()` (404), never "forbidden".
- Hidden events → 404 for everyone except moderators, admins and the owner team.
- Migration `0002` is additive only: `ALTER TABLE … ADD COLUMN` and `CREATE [UNIQUE] INDEX`. It must contain no `DROP TABLE`, no `__new_` tables, no `PRAGMA foreign_keys`.
- Never run anything with `--remote` (D1) or `wrangler secret`/`deploy` without the owner's explicit approval in chat.
- Work on branch `phase-4-events`; never push to `main` directly (a push to `main` deploys production).
- Worker gzip size must stay ≤ 3 MiB (currently 2937 KiB). Measure in the final task; stop and ask if over.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; author email is the GitHub no-reply address already configured.
- Copy is sentence case, plain verbs; errors say what happened and what to do.

## Review Focus

1. **Two teammates claim the same challenge within one refresh window** → exactly one wins; the other sees "already claimed by @x". Pinned by Task 9 step "claim race" (SQL check against local D1).
2. **Times entered in the browser's timezone** (e.g. UTC+4 user types 20:00) → stored as the correct UTC instant and shown back as 20:00 to that user. Pinned by Task 4 `parseInstant` tests + Task 7 browser check.
3. **A teammate saves team notes while you're editing** → your save is refused with the reload message instead of silently overwriting. Pinned by Task 9 `saveTeamNotes` conditional update + Task 11 browser check.
4. **Markdown notes containing `<script>`, `javascript:` links or raw HTML** → rendered inert; links open with `rel="noopener noreferrer nofollow"`. Pinned by Task 10 `sanitizeHtml` test cases.
5. **Migration run on the live D1 with existing teams** → no table rebuild, team memberships survive. Pinned by Task 2 grep check on the SQL + row-count check before/after on local D1.

---

## File map

| File | Responsibility |
|---|---|
| `.github/workflows/ci.yml` | typecheck, lint, tests on push/PR |
| `CONTRIBUTING.md`, `.github/CODEOWNERS` | contributor rules, owner review |
| `wrangler.jsonc` | `observability` on |
| `src/lib/db/enums.ts` | + `EVENT_KINDS`, `PLATFORM_ROLES` |
| `src/lib/db/schema.ts` | new columns + challenge name index |
| `drizzle/migrations/0002_*.sql` | hand-checked additive migration |
| `src/lib/events/timing.ts` (+test) | phase, writable, registration window, countdown text |
| `src/lib/events/permissions.ts` (+test) | `canEvent`, `deleteAllowed`, challenge `nextStatus` |
| `src/lib/auth/platform.ts` (+test) | `PlatformRole`, `isStaff`, `canAdmin` |
| `src/lib/events/validation.ts` (+test) | Zod schemas, `slugify`, `parseInstant`, `parseLinks` |
| `src/lib/security/rate-limit.ts` | + 3 limits |
| `src/lib/teams/audit.ts` | + event/admin audit actions and descriptions |
| `src/lib/auth/member.ts` | ban check in `requireMember` |
| `src/app/suspended/page.tsx` | suspended-account page |
| `src/lib/events/queries.ts` | event / registration / challenge reads |
| `src/lib/events/context.ts` | load event + viewer's team/role/platform role |
| `src/app/events/actions.ts` | event + registration actions |
| `src/components/events/*` | `LocalTime`, `Countdown`, `PhaseBadge`, `EventCard`, `EventForm`, `ArenaBadge` |
| `src/app/events/page.tsx`, `new/page.tsx`, `[slug]/page.tsx`, `[slug]/edit/page.tsx`, `[slug]/EventActions.tsx` | board + event pages |
| `src/app/events/[slug]/war-room/actions.ts` | challenge + notes actions |
| `src/components/markdown/*` | `sanitize.ts` (+test), `MarkdownView.tsx` |
| `src/app/events/[slug]/war-room/page.tsx` + `Board.tsx`, `ChallengeCard.tsx`, `NotesPanel.tsx`, `AutoRefresh.tsx`, `AddChallenge.tsx` | war room UI |
| `src/app/admin/page.tsx`, `actions.ts`, `AdminRow.tsx` | admin page |
| `scripts/seed-dev.mjs` | + `--event` seeding |
| `docs/PROGRESS.md` | Phase 4 section |

---

### Task 1: Branch, CI, contributor docs, Workers Logs

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/CODEOWNERS`, `CONTRIBUTING.md`
- Modify: `.gitignore`, `wrangler.jsonc`

**Interfaces:** none (infrastructure).

- [ ] **Step 1: Create the branch and keep the private plan out of git**

```bash
git switch -c phase-4-events
```
Append to `.gitignore`:
```
# owner's private planning docs
/Guidance/
/Guidance.zip
```
Run `git status --short` — `Guidance` must no longer be listed.

- [ ] **Step 2: CI workflow** — `.github/workflows/ci.yml`

```yaml
name: CI
on:
  push:
    branches: ["**"]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
```
(The OpenNext build is verified by Cloudflare's preview build for the branch; running it in CI would need Clerk keys.)

- [ ] **Step 3: Prove CI passes from a clean checkout**

```bash
git worktree add ../se-ci-check HEAD
cd ../se-ci-check && npm ci && npm run typecheck && npm run lint && npm test; cd -
git worktree remove ../se-ci-check --force
```
Expected: all three succeed. If `typecheck` fails on missing generated files (e.g. `next-env.d.ts`), add `- run: npx next typegen` before typecheck in the workflow and re-run.

- [ ] **Step 4: CODEOWNERS** — `.github/CODEOWNERS`

```
# Every change needs the owner's review.
* @Cyb0rgbytes
```

- [ ] **Step 5: CONTRIBUTING.md**

```markdown
# Contributing to Security Exile

Security Exile is the community hub (teams, events, writeups, profiles). The CTF arena is a separate project.

## Setup
1. Node 22+, `npm ci`.
2. Copy `.dev.vars.example` to `.dev.vars` and fill in a random `INVITE_PEPPER` (32+ chars).
3. Ask the owner for Clerk development keys; put them in `.env.local`. Never commit either file.
4. `npm run db:migrate:local`, then `npm run dev`.

## Workflow
- Branch from `main`, open a pull request. Pushing to `main` deploys production, so `main` is protected.
- CI must pass: `npm run typecheck`, `npm run lint`, `npm test`.
- Cloudflare builds every branch as a preview version; test there before merging.
- Schema changes need the owner's approval and must be additive on live data (no table rebuilds).

## Security rules
- Authorize every server action on the server: `requireMember()`, load the actor's role from the database, then check permissions.
- Validate every input with Zod. Use the Drizzle query builder; never build SQL strings from input.
- Sanitize any user Markdown/HTML before rendering.
- Never commit secrets, keys, `.env*` or `.dev.vars`.
- Report vulnerabilities privately (see `/security`).
```

- [ ] **Step 6: Workers Logs** — in `wrangler.jsonc`, after `"keep_vars": true,` add:

```jsonc
  // Workers Logs (free tier): errors and console output in the dashboard.
  "observability": { "enabled": true },
```
Run: `npx wrangler deploy --dry-run --outdir "$TEMP/se-dry"` → no errors.

- [ ] **Step 7: Commit**

```bash
git add .gitignore .github CONTRIBUTING.md wrangler.jsonc
git commit -m "chore: CI, CODEOWNERS, contributing guide, Workers Logs"
```

---

### Task 2: Enums, schema columns, migration 0002 (local only)

**Files:**
- Modify: `src/lib/db/enums.ts`, `src/lib/db/schema.ts`
- Create: `drizzle/migrations/0002_<generated>.sql` (+ meta snapshot/journal from drizzle-kit)

**Interfaces:**
- Produces: `EVENT_KINDS = ["ctf","community"]`, `PLATFORM_ROLES = ["member","moderator","admin"]`; columns `users.platformRole`, `users.bannedAt`, `events.kind|description|createdBy|ownerTeamId|hiddenAt`, `eventRegistrations.notesMd|notesUpdatedAt`, `challenges.createdBy`; unique index `challenges_name_uq`.

- [ ] **Step 1: Enums** — append to `src/lib/db/enums.ts`:

```ts
export const EVENT_KINDS = ["ctf", "community"] as const;
export const PLATFORM_ROLES = ["member", "moderator", "admin"] as const;
```

- [ ] **Step 2: Schema** — in `src/lib/db/schema.ts`:
  - import `EVENT_KINDS, PLATFORM_ROLES` alongside the existing enum imports (check how enums are imported at the top of the file and follow it; `uniqueIndex` is already imported for team_members).
  - `users`: add after `skills`:
```ts
    platformRole: text("platform_role", { enum: PLATFORM_ROLES }).notNull().default("member"),
    /** set when an admin suspends the account; requireMember() blocks banned members */
    bannedAt: integer("banned_at", { mode: "timestamp_ms" }),
```
   and to its checks array: `check("users_platform_role_ck", oneOf(t.platformRole, PLATFORM_ROLES)),`
  - `events`: add after `weight`:
```ts
    kind: text("kind", { enum: EVENT_KINDS }).notNull().default("ctf"),
    description: text("description"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    /** the team whose captain/co-captains may edit the event */
    ownerTeamId: text("owner_team_id").references(() => teams.id, { onDelete: "set null" }),
    hiddenAt: integer("hidden_at", { mode: "timestamp_ms" }),
```
   and checks: `check("events_kind_ck", oneOf(t.kind, EVENT_KINDS)),`
  - `eventRegistrations`: add after `registeredBy`:
```ts
    notesMd: text("notes_md"),
    notesUpdatedAt: integer("notes_updated_at", { mode: "timestamp_ms" }),
```
  - `challenges`: add after `links`:
```ts
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
```
   and to its index list: `uniqueIndex("challenges_name_uq").on(t.eventId, t.teamId, sql\`lower(${t.name})\`),`

- [ ] **Step 3: Generate, then replace with an additive migration**

Run: `npm run db:generate`. Open the new `drizzle/migrations/0002_*.sql`. drizzle-kit rebuilds tables when CHECKs change; on D1 that would fire `ON DELETE CASCADE` and destroy memberships. **Replace the file's entire contents** with:

```sql
ALTER TABLE `users` ADD `platform_role` text DEFAULT 'member' NOT NULL CHECK (`platform_role` in ('member','moderator','admin'));--> statement-breakpoint
ALTER TABLE `users` ADD `banned_at` integer;--> statement-breakpoint
ALTER TABLE `events` ADD `kind` text DEFAULT 'ctf' NOT NULL CHECK (`kind` in ('ctf','community'));--> statement-breakpoint
ALTER TABLE `events` ADD `description` text;--> statement-breakpoint
ALTER TABLE `events` ADD `created_by` text REFERENCES users(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `events` ADD `owner_team_id` text REFERENCES teams(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `events` ADD `hidden_at` integer;--> statement-breakpoint
ALTER TABLE `event_registrations` ADD `notes_md` text;--> statement-breakpoint
ALTER TABLE `event_registrations` ADD `notes_updated_at` integer;--> statement-breakpoint
ALTER TABLE `challenges` ADD `created_by` text REFERENCES users(id) ON DELETE set null;--> statement-breakpoint
CREATE UNIQUE INDEX `challenges_name_uq` ON `challenges` (`event_id`,`team_id`,lower("name"));
```
Keep the generated `meta/0002_snapshot.json` and journal entry as-is (they describe the schema, so the next `db:generate` sees no diff).

- [ ] **Step 4: Guard check**

Run: `grep -nE "DROP TABLE|__new_|PRAGMA" drizzle/migrations/0002_*.sql` → no output.
Run: `npm run db:generate` again → "No schema changes, nothing to migrate".

- [ ] **Step 5: Apply locally and prove data survives**

```bash
npx wrangler d1 execute DB --local --command "select (select count(*) from users) u, (select count(*) from team_members) m"
npm run db:migrate:local
npx wrangler d1 execute DB --local --command "select (select count(*) from users) u, (select count(*) from team_members) m"
npx wrangler d1 execute DB --local --command "insert into users(id,clerk_id,platform_role,created_at,updated_at) values('ck-test','ck-test','owner',0,0)"
```
Expected: counts identical before/after; the last insert fails with `CHECK constraint failed`.

- [ ] **Step 6: Typecheck + tests, commit**

Run: `npm run typecheck && npm test` → pass.
```bash
git add src/lib/db drizzle/migrations
git commit -m "feat(db): migration 0002 — event kinds/owners, notes, platform roles, bans"
```

---

### Task 3: Event timing helpers

**Files:**
- Create: `src/lib/events/timing.ts`, `src/lib/events/timing.test.ts`

**Interfaces:**
- Produces:
```ts
export type EventPhase = "upcoming" | "live" | "past";
export const WAR_ROOM_GRACE_MS: number; // 86_400_000
export const MAX_EVENT_MS: number;      // 14 days
export function eventPhase(e: { startsAt: Date; endsAt: Date }, now: number): EventPhase;
export function warRoomWritable(e: { endsAt: Date }, now: number): boolean;
export function registrationOpen(e: { kind: "ctf" | "community"; endsAt: Date }, now: number): boolean;
export function formatCountdown(ms: number): string;
```

- [ ] **Step 1: Failing tests** — `src/lib/events/timing.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { eventPhase, formatCountdown, registrationOpen, warRoomWritable, WAR_ROOM_GRACE_MS } from "./timing";

const H = 3_600_000;
const ev = { startsAt: new Date(10 * H), endsAt: new Date(20 * H) };

describe("eventPhase", () => {
  it("is upcoming before start", () => expect(eventPhase(ev, 10 * H - 1)).toBe("upcoming"));
  it("is live from start (inclusive)", () => expect(eventPhase(ev, 10 * H)).toBe("live"));
  it("is live just before end", () => expect(eventPhase(ev, 20 * H - 1)).toBe("live"));
  it("is past at end (exclusive)", () => expect(eventPhase(ev, 20 * H)).toBe("past"));
});

describe("warRoomWritable", () => {
  it("is writable during the event", () => expect(warRoomWritable(ev, 15 * H)).toBe(true));
  it("stays writable inside the 24 h grace", () => expect(warRoomWritable(ev, 20 * H + WAR_ROOM_GRACE_MS - 1)).toBe(true));
  it("locks at end + 24 h", () => expect(warRoomWritable(ev, 20 * H + WAR_ROOM_GRACE_MS)).toBe(false));
});

describe("registrationOpen", () => {
  it("is open for a CTF before it ends", () => expect(registrationOpen({ kind: "ctf", endsAt: ev.endsAt }, 15 * H)).toBe(true));
  it("closes when the CTF ends", () => expect(registrationOpen({ kind: "ctf", endsAt: ev.endsAt }, 20 * H)).toBe(false));
  it("never opens for community events", () => expect(registrationOpen({ kind: "community", endsAt: ev.endsAt }, 0)).toBe(false));
});

describe("formatCountdown", () => {
  it("formats hours:minutes:seconds", () => expect(formatCountdown(2 * H + 14 * 60_000 + 9_000)).toBe("02:14:09"));
  it("adds days when over 24 h", () => expect(formatCountdown(26 * H)).toBe("1d 02:00:00"));
  it("clamps negatives to zero", () => expect(formatCountdown(-5)).toBe("00:00:00"));
});
```

- [ ] **Step 2: Run to see it fail** — `npx vitest run src/lib/events/timing.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement** — `src/lib/events/timing.ts`

```ts
/** Pure time rules for events. `now` is always passed in so callers and tests control the clock. */

export type EventPhase = "upcoming" | "live" | "past";

export const WAR_ROOM_GRACE_MS = 24 * 3_600_000;
export const MAX_EVENT_MS = 14 * 86_400_000;

export function eventPhase(e: { startsAt: Date; endsAt: Date }, now: number): EventPhase {
  if (now < e.startsAt.getTime()) return "upcoming";
  if (now < e.endsAt.getTime()) return "live";
  return "past";
}

/** Teams keep editing for a day after the end to tidy notes before writeups. */
export function warRoomWritable(e: { endsAt: Date }, now: number): boolean {
  return now < e.endsAt.getTime() + WAR_ROOM_GRACE_MS;
}

export function registrationOpen(e: { kind: "ctf" | "community"; endsAt: Date }, now: number): boolean {
  return e.kind === "ctf" && now < e.endsAt.getTime();
}

const pad = (n: number) => String(n).padStart(2, "0");

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86_400);
  const h = Math.floor((total % 86_400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const hms = `${pad(h)}:${pad(m)}:${pad(s)}`;
  return d > 0 ? `${d}d ${hms}` : hms;
}
```

- [ ] **Step 4: Run** — `npx vitest run src/lib/events/timing.test.ts` → PASS.

- [ ] **Step 5: Commit** — `git add src/lib/events/timing* && git commit -m "feat(events): timing rules"`

---

### Task 4: Event validation (Zod, slugs, instants, links)

**Files:**
- Create: `src/lib/events/validation.ts`, `src/lib/events/validation.test.ts`

**Interfaces:**
- Consumes: `FOCUS_CATEGORIES` from `src/lib/teams/validation.ts`; `EVENT_KINDS`; `MAX_EVENT_MS` (Task 3).
- Produces:
```ts
export function slugify(title: string): string;
export function parseInstant(v: unknown): Date | null; // ISO string from the browser → Date
export function parseLinks(text: string): { label: string; url: string }[] | { error: string };
export const httpUrl: z.ZodType<string>;
export const eventInputSchema: z.ZodObject<...>; // { title, kind, format, url, description, startsAt: Date, endsAt: Date }
export function validateWindow(startsAt: Date, endsAt: Date, now: number, isNew: boolean): string | null;
export const challengeInputSchema; // { name, category, points: number | null }
export const challengeNotesSchema; // string ≤ 10000
export const teamNotesSchema;      // string ≤ 20000
export const slugParamSchema;      // /^[a-z0-9-]{1,70}$/
```

- [ ] **Step 1: Failing tests** — `src/lib/events/validation.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { challengeInputSchema, eventInputSchema, parseInstant, parseLinks, slugify, validateWindow } from "./validation";

const H = 3_600_000;

describe("slugify", () => {
  it("lowercases and dashes", () => expect(slugify("DEF CON Quals 2026!")).toBe("def-con-quals-2026"));
  it("trims dashes and caps length", () => expect(slugify("--" + "a".repeat(100) + "--")).toBe("a".repeat(60)));
  it("falls back when nothing usable is left", () => expect(slugify("!!!")).toBe("event"));
  it("drops non-latin characters", () => expect(slugify("مسابقة CTF")).toBe("ctf"));
});

describe("parseInstant", () => {
  it("parses an ISO instant with offset", () => expect(parseInstant("2026-10-02T16:00:00.000Z")?.getTime()).toBe(Date.UTC(2026, 9, 2, 16)));
  it("keeps the instant a UTC+4 browser sent", () =>
    // browser in UTC+4 typed 20:00 → toISOString() gives 16:00Z
    expect(parseInstant(new Date("2026-10-02T20:00:00+04:00").toISOString())?.getUTCHours()).toBe(16));
  it("rejects garbage", () => expect(parseInstant("tomorrow")).toBeNull());
  it("rejects strings without a zone", () => expect(parseInstant("2026-10-02T20:00")).toBeNull());
});

describe("parseLinks", () => {
  it("accepts 'label | url' and bare urls", () =>
    expect(parseLinks("source | https://x.io/a\nhttps://y.io")).toEqual([
      { label: "source", url: "https://x.io/a" },
      { label: "y.io", url: "https://y.io" },
    ]));
  it("rejects javascript: urls", () => expect(parseLinks("x | javascript:alert(1)")).toHaveProperty("error"));
  it("rejects more than 10 links", () => expect(parseLinks(Array(11).fill("https://a.io").join("\n"))).toHaveProperty("error"));
  it("ignores blank lines", () => expect(parseLinks("\n\nhttps://a.io\n")).toEqual([{ label: "a.io", url: "https://a.io" }]));
});

describe("eventInputSchema", () => {
  const ok = { title: "Exile CTF", kind: "ctf", format: "jeopardy", url: "https://ctf.example", description: "", startsAt: "2030-01-01T00:00:00.000Z", endsAt: "2030-01-02T00:00:00.000Z" };
  it("accepts a valid event", () => expect(eventInputSchema.safeParse(ok).success).toBe(true));
  it("rejects a non-http url", () => expect(eventInputSchema.safeParse({ ...ok, url: "ftp://x" }).success).toBe(false));
  it("allows an empty url", () => expect(eventInputSchema.safeParse({ ...ok, url: "" }).success).toBe(true));
  it("rejects a short title", () => expect(eventInputSchema.safeParse({ ...ok, title: "ab" }).success).toBe(false));
  it("rejects an unknown kind", () => expect(eventInputSchema.safeParse({ ...ok, kind: "party" }).success).toBe(false));
});

describe("validateWindow", () => {
  const now = 100 * H;
  it("needs end after start", () => expect(validateWindow(new Date(200 * H), new Date(200 * H), now, true)).toMatch(/after/));
  it("needs a future start for new events", () => expect(validateWindow(new Date(99 * H), new Date(120 * H), now, true)).toMatch(/future/));
  it("allows a past start when editing", () => expect(validateWindow(new Date(99 * H), new Date(120 * H), now, false)).toBeNull());
  it("caps length at 14 days", () => expect(validateWindow(new Date(200 * H), new Date(200 * H + 14 * 24 * H + 1), now, true)).toMatch(/14 days/));
});

describe("challengeInputSchema", () => {
  it("accepts a valid challenge", () => expect(challengeInputSchema.safeParse({ name: "baby-rop", category: "pwn", points: "250" }).data).toEqual({ name: "baby-rop", category: "pwn", points: 250 }));
  it("treats empty points as null", () => expect(challengeInputSchema.safeParse({ name: "x", category: "web", points: "" }).data?.points).toBeNull());
  it("rejects unknown categories", () => expect(challengeInputSchema.safeParse({ name: "x", category: "cooking", points: "" }).success).toBe(false));
  it("rejects points over 10000", () => expect(challengeInputSchema.safeParse({ name: "x", category: "web", points: "10001" }).success).toBe(false));
});
```

- [ ] **Step 2: Run to see it fail** — `npx vitest run src/lib/events/validation.test.ts` → FAIL.

- [ ] **Step 3: Implement** — `src/lib/events/validation.ts`

```ts
import { z } from "zod";
import { EVENT_KINDS } from "@/lib/db/enums";
import { FOCUS_CATEGORIES } from "@/lib/teams/validation";
import { MAX_EVENT_MS } from "./timing";

export function slugify(title: string): string {
  const s = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return s || "event";
}

/** Browser sends `new Date(localValue).toISOString()`; require an explicit zone so the server never guesses. */
export function parseInstant(v: unknown): Date | null {
  if (typeof v !== "string" || !/(Z|[+-]\d{2}:\d{2})$/.test(v)) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const httpUrl = z.url({ protocol: /^https?$/, message: "Use a link starting with http:// or https://." }).max(500);

export function parseLinks(text: string): { label: string; url: string }[] | { error: string } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 10) return { error: "At most 10 links." };
  const out: { label: string; url: string }[] = [];
  for (const line of lines) {
    const [a, b] = line.includes("|") ? line.split("|", 2).map((s) => s.trim()) : [null, line];
    const url = httpUrl.safeParse(b);
    if (!url.success) return { error: `Not a valid http(s) link: ${b.slice(0, 60)}` };
    const label = (a || new URL(url.data).host).slice(0, 40);
    out.push({ label, url: url.data });
  }
  return out;
}

const instant = z.unknown().transform((v, ctx) => {
  const d = parseInstant(v);
  if (!d) {
    ctx.addIssue({ code: "custom", message: "Pick a valid date and time." });
    return z.NEVER;
  }
  return d;
});

export const eventInputSchema = z.object({
  title: z.string().trim().min(3, "Title needs at least 3 characters.").max(80, "Title is at most 80 characters."),
  kind: z.enum(EVENT_KINDS),
  format: z.string().trim().max(30, "Format is at most 30 characters.").optional().default(""),
  url: z.union([z.literal(""), httpUrl]).optional().default(""),
  description: z.string().trim().max(2000, "Description is at most 2000 characters.").optional().default(""),
  startsAt: instant,
  endsAt: instant,
});
export type EventInput = z.infer<typeof eventInputSchema>;

/** Returns an error message, or null when the window is acceptable. */
export function validateWindow(startsAt: Date, endsAt: Date, now: number, isNew: boolean): string | null {
  if (endsAt.getTime() <= startsAt.getTime()) return "The end time must be after the start time.";
  if (isNew && startsAt.getTime() <= now) return "New events must start in the future.";
  if (endsAt.getTime() - startsAt.getTime() > MAX_EVENT_MS) return "Events can last at most 14 days.";
  return null;
}

export const challengeInputSchema = z.object({
  name: z.string().trim().min(1, "Give the challenge a name.").max(60, "Name is at most 60 characters."),
  category: z.enum(FOCUS_CATEGORIES),
  points: z
    .string()
    .trim()
    .transform((s, ctx) => {
      if (s === "") return null;
      const n = Number(s);
      if (!Number.isInteger(n) || n < 0 || n > 10_000) {
        ctx.addIssue({ code: "custom", message: "Points must be a whole number from 0 to 10000." });
        return z.NEVER;
      }
      return n;
    }),
});

export const challengeNotesSchema = z.string().max(10_000, "Notes are at most 10000 characters.");
export const teamNotesSchema = z.string().max(20_000, "Notes are at most 20000 characters.");
export const slugParamSchema = z.string().regex(/^[a-z0-9-]{1,70}$/);
```
Check `FOCUS_CATEGORIES` is declared `as const` in `src/lib/teams/validation.ts` (it is used with `z.enum` there already); if not, adapt to `z.enum(FOCUS_CATEGORIES as unknown as [string, ...string[]])`.

- [ ] **Step 4: Run** — `npx vitest run src/lib/events/validation.test.ts` → PASS.

- [ ] **Step 5: Commit** — `git add src/lib/events/validation* && git commit -m "feat(events): input validation, slugs, link parsing"`

---

### Task 5: Permissions — events, challenge transitions, platform roles

**Files:**
- Create: `src/lib/events/permissions.ts`, `src/lib/events/permissions.test.ts`, `src/lib/auth/platform.ts`, `src/lib/auth/platform.test.ts`

**Interfaces:**
- Consumes: `TeamRole` from `src/lib/teams/permissions.ts`; `PLATFORM_ROLES`, `CHALLENGE_STATUSES`; `EventPhase` (Task 3).
- Produces:
```ts
// src/lib/auth/platform.ts
export type PlatformRole = "member" | "moderator" | "admin";
export function isStaff(r: PlatformRole | null | undefined): boolean;
export type AdminAction = "role.assign" | "member.ban";
export function canAdmin(actor: { id: string; role: PlatformRole }, action: AdminAction, target: { id: string; role: PlatformRole }): boolean;

// src/lib/events/permissions.ts
export type EventAction = "event.create" | "event.edit" | "event.delete" | "event.hide" | "event.register" | "event.roster";
export interface EventActor { teamRole: TeamRole | null; ownsEvent: boolean; platformRole: PlatformRole }
export function canEvent(a: EventActor, action: EventAction): boolean;
export function deleteAllowed(phase: EventPhase, otherTeamsRegistered: number): boolean;
export type ChallengeStatus = "open" | "claimed" | "solving" | "solved";
export type Move = "claim" | "start" | "solve" | "release" | "reopen";
export const MOVES: readonly Move[];
export function nextStatus(from: ChallengeStatus, move: Move, ctx: { isClaimer: boolean; isLead: boolean }): ChallengeStatus | null;
```

- [ ] **Step 1: Failing tests** — `src/lib/auth/platform.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { canAdmin, isStaff } from "./platform";

const admin = { id: "a", role: "admin" as const };
describe("isStaff", () => {
  it("covers moderator and admin", () => {
    expect(isStaff("moderator")).toBe(true);
    expect(isStaff("admin")).toBe(true);
    expect(isStaff("member")).toBe(false);
    expect(isStaff(null)).toBe(false);
  });
});
describe("canAdmin", () => {
  it("lets admins manage members and moderators", () => {
    expect(canAdmin(admin, "role.assign", { id: "b", role: "member" })).toBe(true);
    expect(canAdmin(admin, "member.ban", { id: "b", role: "moderator" })).toBe(true);
  });
  it("never acts on yourself", () => {
    expect(canAdmin(admin, "role.assign", { id: "a", role: "admin" })).toBe(false);
    expect(canAdmin(admin, "member.ban", { id: "a", role: "admin" })).toBe(false);
  });
  it("can't ban another admin (demote first)", () => expect(canAdmin(admin, "member.ban", { id: "b", role: "admin" })).toBe(false));
  it("moderators can't administer", () => expect(canAdmin({ id: "m", role: "moderator" }, "role.assign", { id: "b", role: "member" })).toBe(false));
});
```

`src/lib/events/permissions.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { canEvent, deleteAllowed, MOVES, nextStatus, type ChallengeStatus } from "./permissions";

const base = { teamRole: null, ownsEvent: false, platformRole: "member" } as const;

describe("canEvent", () => {
  it("captains and co-captains create events; members don't", () => {
    expect(canEvent({ ...base, teamRole: "captain" }, "event.create")).toBe(true);
    expect(canEvent({ ...base, teamRole: "co_captain" }, "event.create")).toBe(true);
    expect(canEvent({ ...base, teamRole: "member" }, "event.create")).toBe(false);
    expect(canEvent(base, "event.create")).toBe(false);
  });
  it("only the owner team's leads edit or delete", () => {
    expect(canEvent({ ...base, teamRole: "captain", ownsEvent: true }, "event.edit")).toBe(true);
    expect(canEvent({ ...base, teamRole: "captain", ownsEvent: false }, "event.edit")).toBe(false);
    expect(canEvent({ ...base, teamRole: "member", ownsEvent: true }, "event.delete")).toBe(false);
  });
  it("staff hide events, without team roles", () => {
    expect(canEvent({ ...base, platformRole: "moderator" }, "event.hide")).toBe(true);
    expect(canEvent({ ...base, teamRole: "captain", ownsEvent: true }, "event.hide")).toBe(false);
  });
  it("staff role doesn't grant team actions", () => expect(canEvent({ ...base, platformRole: "admin" }, "event.register")).toBe(false));
  it("leads register and set rosters", () => {
    expect(canEvent({ ...base, teamRole: "co_captain" }, "event.register")).toBe(true);
    expect(canEvent({ ...base, teamRole: "reserve" }, "event.roster")).toBe(false);
  });
});

describe("deleteAllowed", () => {
  it("only before start with no other teams", () => {
    expect(deleteAllowed("upcoming", 0)).toBe(true);
    expect(deleteAllowed("upcoming", 1)).toBe(false);
    expect(deleteAllowed("live", 0)).toBe(false);
  });
});

describe("nextStatus", () => {
  const anyone = { isClaimer: false, isLead: false };
  const claimer = { isClaimer: true, isLead: false };
  const lead = { isClaimer: false, isLead: true };
  it("anyone claims an open challenge", () => expect(nextStatus("open", "claim", anyone)).toBe("claimed"));
  it("can't claim a claimed challenge", () => expect(nextStatus("claimed", "claim", anyone)).toBeNull());
  it("claimer starts solving", () => expect(nextStatus("claimed", "start", claimer)).toBe("solving"));
  it("others can't start someone else's claim", () => expect(nextStatus("claimed", "start", anyone)).toBeNull());
  it("anyone may mark an open challenge solved", () => expect(nextStatus("open", "solve", anyone)).toBe("solved"));
  it("only claimer/lead solve a claimed one", () => {
    expect(nextStatus("solving", "solve", anyone)).toBeNull();
    expect(nextStatus("solving", "solve", lead)).toBe("solved");
  });
  it("release returns to open for claimer or lead", () => {
    expect(nextStatus("solving", "release", claimer)).toBe("open");
    expect(nextStatus("claimed", "release", lead)).toBe("open");
    expect(nextStatus("claimed", "release", anyone)).toBeNull();
  });
  it("reopen only from solved", () => {
    expect(nextStatus("solved", "reopen", claimer)).toBe("open");
    expect(nextStatus("open", "reopen", lead)).toBeNull();
  });
  it("every (status, move) pair is defined", () => {
    for (const s of ["open", "claimed", "solving", "solved"] as ChallengeStatus[])
      for (const m of MOVES) expect(() => nextStatus(s, m, lead)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run to see them fail** — `npx vitest run src/lib/events/permissions.test.ts src/lib/auth/platform.test.ts` → FAIL.

- [ ] **Step 3: Implement** — `src/lib/auth/platform.ts`

```ts
import type { PLATFORM_ROLES } from "@/lib/db/enums";

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

/** Site-wide moderation powers; separate from team roles. */
export function isStaff(r: PlatformRole | null | undefined): boolean {
  return r === "moderator" || r === "admin";
}

export type AdminAction = "role.assign" | "member.ban";

/** Admins manage everyone but themselves; another admin must be demoted before a ban. */
export function canAdmin(actor: { id: string; role: PlatformRole }, action: AdminAction, target: { id: string; role: PlatformRole }): boolean {
  if (actor.role !== "admin" || actor.id === target.id) return false;
  if (action === "member.ban") return target.role !== "admin";
  return true;
}
```

`src/lib/events/permissions.ts`

```ts
import type { CHALLENGE_STATUSES } from "@/lib/db/enums";
import type { PlatformRole } from "@/lib/auth/platform";
import { isStaff } from "@/lib/auth/platform";
import type { TeamRole } from "@/lib/teams/permissions";
import type { EventPhase } from "./timing";

export type EventAction = "event.create" | "event.edit" | "event.delete" | "event.hide" | "event.register" | "event.roster";

export interface EventActor {
  /** role in the viewer's own team (one team per member) */
  teamRole: TeamRole | null;
  /** the viewer's team is the event's owner_team_id */
  ownsEvent: boolean;
  platformRole: PlatformRole;
}

/** Single source of truth for event permissions; server actions call it, the UI only hides buttons. */
export function canEvent(a: EventActor, action: EventAction): boolean {
  const lead = a.teamRole === "captain" || a.teamRole === "co_captain";
  switch (action) {
    case "event.create":
    case "event.register":
    case "event.roster":
      return lead;
    case "event.edit":
    case "event.delete":
      return lead && a.ownsEvent;
    case "event.hide":
      return isStaff(a.platformRole);
  }
}

/** Deleting would pull the event out from under other teams once anyone else signed up or it started. */
export function deleteAllowed(phase: EventPhase, otherTeamsRegistered: number): boolean {
  return phase === "upcoming" && otherTeamsRegistered === 0;
}

export type ChallengeStatus = (typeof CHALLENGE_STATUSES)[number];
export type Move = "claim" | "start" | "solve" | "release" | "reopen";
export const MOVES = ["claim", "start", "solve", "release", "reopen"] as const satisfies readonly Move[];

/** War-room state machine. Returns the new status, or null if the move isn't allowed. */
export function nextStatus(from: ChallengeStatus, move: Move, ctx: { isClaimer: boolean; isLead: boolean }): ChallengeStatus | null {
  const owner = ctx.isClaimer || ctx.isLead;
  switch (move) {
    case "claim":
      return from === "open" ? "claimed" : null;
    case "start":
      return from === "claimed" && owner ? "solving" : null;
    case "solve":
      if (from === "open") return "solved";
      return (from === "claimed" || from === "solving") && owner ? "solved" : null;
    case "release":
      return (from === "claimed" || from === "solving") && owner ? "open" : null;
    case "reopen":
      return from === "solved" && owner ? "open" : null;
  }
}
```

- [ ] **Step 4: Run** — same command → PASS. `npm run typecheck` → PASS.

- [ ] **Step 5: Commit** — `git add src/lib/events/permissions* src/lib/auth/platform* && git commit -m "feat(events): event permissions, challenge state machine, platform roles"`

---

### Task 6: Bans, rate limits, audit actions

**Files:**
- Modify: `src/lib/auth/member.ts`, `src/lib/security/rate-limit.ts`, `src/lib/teams/audit.ts`
- Create: `src/app/suspended/page.tsx`
- Test: `src/lib/security/rate-limit.test.ts` (extend)

**Interfaces:**
- Produces: `LIMITS.eventCreate | challengeCreate | warRoomWrite`; `AuditAction` gains `"event.create" | "event.update" | "event.delete" | "event.hide" | "event.unhide" | "event.register" | "event.unregister" | "event.roster" | "admin.set_role" | "admin.ban" | "admin.unban"`; `requireMember()` redirects banned members to `/suspended`.

- [ ] **Step 1: Failing test** — append to `src/lib/security/rate-limit.test.ts`:

```ts
describe("Phase 4 limits", () => {
  it("match the spec", () => {
    expect(LIMITS.eventCreate).toEqual({ max: 3, windowSec: 86_400 });
    expect(LIMITS.challengeCreate).toEqual({ max: 60, windowSec: 3600 });
    expect(LIMITS.warRoomWrite).toEqual({ max: 300, windowSec: 3600 });
  });
});
```
(Ensure `LIMITS` and `describe/it/expect` are imported at the top of that file; add to the import if missing.)
Run: `npx vitest run src/lib/security/rate-limit.test.ts` → FAIL.

- [ ] **Step 2: Limits** — in `LIMITS` add:

```ts
  eventCreate: { max: 3, windowSec: 86_400 },
  challengeCreate: { max: 60, windowSec: 3600 },
  warRoomWrite: { max: 300, windowSec: 3600 },
```
Run the test → PASS.

- [ ] **Step 3: Audit actions** — in `src/lib/teams/audit.ts`, extend the `AuditAction` union with the 11 actions above and add cases to `describeAudit` before `default`:

```ts
    case "event.create": return `${who} added the event ${m.title ?? ""}`.trim();
    case "event.update": return `${who} edited the event ${m.title ?? ""}`.trim();
    case "event.delete": return `${who} deleted the event ${m.title ?? ""}`.trim();
    case "event.hide": return `${who} hid the event ${m.title ?? ""}`.trim();
    case "event.unhide": return `${who} restored the event ${m.title ?? ""}`.trim();
    case "event.register": return `${who} registered the team for ${m.title ?? "an event"}`;
    case "event.unregister": return `${who} withdrew the team from ${m.title ?? "an event"}`;
    case "event.roster": return `${who} updated the roster for ${m.title ?? "an event"}`;
    case "admin.set_role": return `${who} made ${target} ${String(m.role ?? "")}`;
    case "admin.ban": return `${who} suspended ${target}`;
    case "admin.unban": return `${who} lifted ${target}'s suspension`;
```

- [ ] **Step 4: Ban check** — in `requireMember()` in `src/lib/auth/member.ts`, after the `!member` redirect:

```ts
  if (member.bannedAt) redirect("/suspended");
```

- [ ] **Step 5: Suspended page** — `src/app/suspended/page.tsx`

```tsx
import type { Metadata } from "next";
import { SignOutButton } from "@clerk/nextjs";
import { CursorHeading } from "@/components/fx/CursorHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";

export const metadata: Metadata = { title: "Account suspended", robots: { index: false } };

export default function SuspendedPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 pt-16 sm:px-6">
      <CursorHeading level={1} prompt="#">
        account suspended
      </CursorHeading>
      <GlassPanel className="mt-8 space-y-3 p-6 text-sm text-fg-muted">
        <p>A moderator suspended this account, so you can&apos;t post, join teams or use war rooms.</p>
        <p>If you think this is a mistake, contact the moderators on the community Discord.</p>
        <SignOutButton>
          <button type="button" className="rounded border border-line-strong px-4 py-2 font-mono text-sm text-fg hover:border-green-bright">
            sign out
          </button>
        </SignOutButton>
      </GlassPanel>
    </article>
  );
}
```

- [ ] **Step 6: Verify + commit**

Run: `npm run typecheck && npm run lint && npm test` → pass.
```bash
git add src/lib src/app/suspended
git commit -m "feat: account suspension, Phase 4 rate limits and audit actions"
```

---

### Task 7: Event queries, context, actions, board + event pages

**Files:**
- Create: `src/lib/events/queries.ts`, `src/lib/events/context.ts`, `src/app/events/actions.ts`, `src/components/events/{LocalTime,Countdown,PhaseBadge,ArenaBadge,EventCard,EventForm}.tsx`, `src/app/events/new/page.tsx`, `src/app/events/[slug]/page.tsx`, `src/app/events/[slug]/EventActions.tsx`, `src/app/events/[slug]/edit/page.tsx`
- Modify: `src/app/events/page.tsx` (replace placeholder)

**Interfaces:**
- Consumes: Tasks 2–6; `findMembershipOf`, `listRoster` (`src/lib/teams/queries.ts`); `EmblemBadge`, `FormMessage`, `SubmitButton`, `inputCls`, `labelCls`, `NeonButton`, `GlassPanel`, `CursorHeading`.
- Produces:
```ts
// queries.ts
export type EventRow = typeof events.$inferSelect;
export async function listBoard(db: Db, opts: { includeHidden: boolean }): Promise<Array<EventRow & { ownerTag: string | null; ownerLogo: string | null; teams: number }>>;
export async function findEventBySlug(db: Db, slug: string): Promise<EventRow | undefined>;
export async function listRegisteredTeams(db: Db, eventId: string): Promise<Array<{ teamId: string; tag: string; name: string; logoKey: string | null; roster: string[] }>>;
export async function findRegistration(db: Db, eventId: string, teamId: string): Promise<typeof eventRegistrations.$inferSelect | undefined>;
// context.ts
export interface EventViewer { member: OnboardedMember | null; team: Team | null; teamRole: TeamRole | null; actor: EventActor }
export async function loadViewer(db: Db): Promise<EventViewer>; // uses getMember (optional sign-in)
export function canSeeEvent(e: EventRow, v: EventViewer): boolean; // hidden rule
// actions.ts — all return Promise<ActionState> (re-export ActionState type from teams/actions)
createEvent(_prev, form), updateEvent(slug, _prev, form), deleteEvent(slug, _prev, form), setEventHidden(slug, hidden: boolean),
registerTeam(slug), unregisterTeam(slug, _prev, form), setRoster(slug, _prev, form)
```

- [ ] **Step 1: Queries** — `src/lib/events/queries.ts`

```ts
import "server-only";
import { and, asc, count, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { challenges, eventRegistrations, events, teams, users } from "@/lib/db/schema";

export type EventRow = typeof events.$inferSelect;

/** Board rows (newest window first); phases are derived in the page with eventPhase(). */
export async function listBoard(db: Db, opts: { includeHidden: boolean }) {
  return db
    .select({
      event: events,
      ownerTag: teams.tag,
      ownerLogo: teams.logoKey,
      teams: count(eventRegistrations.teamId),
    })
    .from(events)
    .leftJoin(teams, eq(teams.id, events.ownerTeamId))
    .leftJoin(eventRegistrations, eq(eventRegistrations.eventId, events.id))
    .where(opts.includeHidden ? undefined : isNull(events.hiddenAt))
    .groupBy(events.id)
    .orderBy(asc(events.startsAt))
    .limit(300);
}

export async function findEventBySlug(db: Db, slug: string) {
  return db.query.events.findFirst({ where: eq(events.slug, slug) });
}

export async function listRegisteredTeams(db: Db, eventId: string) {
  return db
    .select({ teamId: teams.id, tag: teams.tag, name: teams.name, logoKey: teams.logoKey, roster: eventRegistrations.roster })
    .from(eventRegistrations)
    .innerJoin(teams, eq(teams.id, eventRegistrations.teamId))
    .where(eq(eventRegistrations.eventId, eventId))
    .orderBy(asc(eventRegistrations.createdAt));
}

export async function findRegistration(db: Db, eventId: string, teamId: string) {
  return db.query.eventRegistrations.findFirst({
    where: and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.teamId, teamId)),
  });
}

/** War-room board for one team; claimer handle joined for display. */
export async function listChallenges(db: Db, eventId: string, teamId: string) {
  return db
    .select({ c: challenges, claimer: users.handle })
    .from(challenges)
    .leftJoin(users, eq(users.id, challenges.claimedBy))
    .where(and(eq(challenges.eventId, eventId), eq(challenges.teamId, teamId)))
    .orderBy(desc(challenges.updatedAt));
}
```
(Task 11 adds `or` and `like` to this import when it appends `listRecentAudit`.)

- [ ] **Step 2: Viewer context** — `src/lib/events/context.ts`

```ts
import "server-only";
import { getMember, type OnboardedMember } from "@/lib/auth/member";
import type { Db } from "@/lib/db/client";
import { isStaff } from "@/lib/auth/platform";
import { findMembershipOf, type Team } from "@/lib/teams/queries";
import type { TeamRole } from "@/lib/teams/permissions";
import type { EventActor } from "./permissions";
import type { EventRow } from "./queries";

export interface EventViewer {
  member: OnboardedMember | null;
  team: Team | null;
  teamRole: TeamRole | null;
  staff: boolean;
}

/** Who is looking: optional sign-in for public pages. Banned members are treated as signed out. */
export async function loadViewer(db: Db): Promise<EventViewer> {
  const m = await getMember();
  if (!m || !m.handle || m.bannedAt) return { member: null, team: null, teamRole: null, staff: false };
  const membership = await findMembershipOf(db, m.id);
  return { member: m as OnboardedMember, team: membership?.team ?? null, teamRole: membership?.role ?? null, staff: isStaff(m.platformRole) };
}

export function actorFor(v: EventViewer, e: EventRow | null): EventActor {
  return {
    teamRole: v.teamRole,
    ownsEvent: !!e && !!v.team && e.ownerTeamId === v.team.id,
    platformRole: v.member?.platformRole ?? "member",
  };
}

export function canSeeEvent(e: EventRow, v: EventViewer): boolean {
  if (!e.hiddenAt) return true;
  return v.staff || (!!v.team && e.ownerTeamId === v.team.id);
}
```

- [ ] **Step 3: Actions** — `src/app/events/actions.ts`

```ts
"use server";

/*
 * Event + registration mutations. Same order as team actions:
 *   requireMember → load event + viewer team/role → canEvent() → Zod → write (+ audit in one batch) → revalidate.
 */
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { requireMember } from "@/lib/auth/member";
import { getDb, getEnv } from "@/lib/db/client";
import { newId } from "@/lib/db/ids";
import { auditLog, challenges, eventRegistrations, events, teamMembers } from "@/lib/db/schema";
import { actorFor, type EventViewer } from "@/lib/events/context";
import { canEvent, deleteAllowed, type EventAction } from "@/lib/events/permissions";
import { findEventBySlug, findRegistration } from "@/lib/events/queries";
import { eventPhase, registrationOpen } from "@/lib/events/timing";
import { eventInputSchema, slugify, slugParamSchema, validateWindow } from "@/lib/events/validation";
import { isStaff } from "@/lib/auth/platform";
import { hit, LIMITS, retryMessage } from "@/lib/security/rate-limit";
import { auditEntry } from "@/lib/teams/audit";
import { findMembershipOf } from "@/lib/teams/queries";
import type { ActionState } from "@/app/teams/actions";

const firstIssue = (e: { issues: { message: string }[] }) => e.issues[0]?.message ?? "Invalid input.";

function revalidateEvent(slug: string) {
  revalidatePath("/events");
  revalidatePath(`/events/${slug}`);
}

/** Viewer from requireMember (actions always need a signed-in, non-banned member). */
async function actingViewer() {
  const member = await requireMember();
  const db = getDb();
  const membership = await findMembershipOf(db, member.id);
  const viewer: EventViewer = { member, team: membership?.team ?? null, teamRole: membership?.role ?? null, staff: isStaff(member.platformRole) };
  return { db, member, viewer };
}

async function authorizeEvent(slugRaw: string, action: EventAction) {
  const { db, member, viewer } = await actingViewer();
  const slug = slugParamSchema.safeParse(slugRaw);
  if (!slug.success) return { error: "Event not found." } as const;
  const event = await findEventBySlug(db, slug.data);
  if (!event) return { error: "Event not found." } as const;
  if (!canEvent(actorFor(viewer, event), action)) return { error: "You don't have permission to do that." } as const;
  return { db, member, viewer, event } as const;
}

function readEventForm(form: FormData) {
  return {
    title: String(form.get("title") ?? ""),
    kind: String(form.get("kind") ?? "ctf"),
    format: String(form.get("format") ?? ""),
    url: String(form.get("url") ?? ""),
    description: String(form.get("description") ?? ""),
    startsAt: form.get("startsAt"),
    endsAt: form.get("endsAt"),
  };
}

async function uniqueSlug(db: ReturnType<typeof getDb>, title: string): Promise<string> {
  const base = slugify(title);
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    if (!(await findEventBySlug(db, candidate))) return candidate;
  }
  return `${base}-${newId().slice(-6).toLowerCase()}`;
}

export async function createEvent(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { db, member, viewer } = await actingViewer();
  const raw = readEventForm(form);
  const fields = { title: raw.title, format: raw.format, url: raw.url, description: raw.description };
  if (!viewer.team || !canEvent(actorFor(viewer, null), "event.create"))
    return { error: "Only team captains and co-captains can add events.", fields };
  const parsed = eventInputSchema.safeParse(raw);
  if (!parsed.success) return { error: firstIssue(parsed.error), fields };
  const v = parsed.data;
  const windowError = validateWindow(v.startsAt, v.endsAt, Date.now(), true);
  if (windowError) return { error: windowError, fields };

  const rl = await hit(getEnv().KV, `event-create:${member.id}`, LIMITS.eventCreate);
  if (!rl.ok) return { error: retryMessage(rl), fields };

  const id = newId();
  const slug = await uniqueSlug(db, v.title);
  await db.batch([
    db.insert(events).values({
      id,
      slug,
      title: v.title,
      kind: v.kind,
      format: v.format || null,
      url: v.url || null,
      description: v.description || null,
      startsAt: v.startsAt,
      endsAt: v.endsAt,
      createdBy: member.id,
      ownerTeamId: viewer.team.id,
    }),
    db.insert(auditLog).values(auditEntry({ teamId: viewer.team.id, actorId: member.id, action: "event.create", targetId: id, meta: { title: v.title } })),
  ]);
  revalidatePath("/events");
  redirect(`/events/${slug}`);
}

export async function updateEvent(slug: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await authorizeEvent(slug, "event.edit");
  if ("error" in ctx) return { error: ctx.error };
  const { db, member, event } = ctx;
  const now = Date.now();
  const started = eventPhase(event, now) !== "upcoming";
  const raw = readEventForm(form);

  if (started) {
    // After the start only the end time (later only) and the link may change.
    const parsed = eventInputSchema.pick({ url: true, endsAt: true }).safeParse(raw);
    if (!parsed.success) return { error: firstIssue(parsed.error) };
    if (parsed.data.endsAt.getTime() < event.endsAt.getTime()) return { error: "Once an event has started, its end can only move later." };
    const windowError = validateWindow(event.startsAt, parsed.data.endsAt, now, false);
    if (windowError) return { error: windowError };
    await db.batch([
      db.update(events).set({ url: parsed.data.url || null, endsAt: parsed.data.endsAt }).where(eq(events.id, event.id)),
      db.insert(auditLog).values(auditEntry({ teamId: event.ownerTeamId, actorId: member.id, action: "event.update", targetId: event.id, meta: { title: event.title } })),
    ]);
  } else {
    const parsed = eventInputSchema.safeParse(raw);
    if (!parsed.success) return { error: firstIssue(parsed.error) };
    const v = parsed.data;
    const windowError = validateWindow(v.startsAt, v.endsAt, now, true);
    if (windowError) return { error: windowError };
    await db.batch([
      db
        .update(events)
        .set({ title: v.title, kind: v.kind, format: v.format || null, url: v.url || null, description: v.description || null, startsAt: v.startsAt, endsAt: v.endsAt })
        .where(eq(events.id, event.id)),
      db.insert(auditLog).values(auditEntry({ teamId: event.ownerTeamId, actorId: member.id, action: "event.update", targetId: event.id, meta: { title: v.title } })),
    ]);
  }
  revalidateEvent(event.slug);
  redirect(`/events/${event.slug}`);
}

export async function deleteEvent(slug: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await authorizeEvent(slug, "event.delete");
  if ("error" in ctx) return { error: ctx.error };
  const { db, member, event, viewer } = ctx;
  if (String(form.get("confirm") ?? "") !== event.slug) return { error: `Type ${event.slug} to confirm.` };
  const others = await db.$count(eventRegistrations, and(eq(eventRegistrations.eventId, event.id), ne(eventRegistrations.teamId, viewer.team!.id)));
  if (!deleteAllowed(eventPhase(event, Date.now()), others))
    return { error: "Events can only be deleted before they start and before other teams register." };
  await db.batch([
    db.delete(events).where(eq(events.id, event.id)),
    db.insert(auditLog).values(auditEntry({ teamId: event.ownerTeamId, actorId: member.id, action: "event.delete", targetId: event.id, meta: { title: event.title } })),
  ]);
  revalidatePath("/events");
  redirect("/events");
}

export async function setEventHidden(slug: string, hidden: boolean): Promise<ActionState> {
  const ctx = await authorizeEvent(slug, "event.hide");
  if ("error" in ctx) return { error: ctx.error };
  const { db, member, event } = ctx;
  await db.batch([
    db.update(events).set({ hiddenAt: hidden ? new Date() : null }).where(eq(events.id, event.id)),
    db.insert(auditLog).values(auditEntry({ teamId: null, actorId: member.id, action: hidden ? "event.hide" : "event.unhide", targetId: event.id, meta: { title: event.title } })),
  ]);
  revalidateEvent(event.slug);
  return { ok: hidden ? "Event hidden." : "Event restored." };
}

export async function registerTeam(slug: string): Promise<ActionState> {
  const ctx = await authorizeEvent(slug, "event.register");
  if ("error" in ctx) return { error: ctx.error };
  const { db, member, event, viewer } = ctx;
  if (event.hiddenAt) return { error: "Event not found." };
  if (!registrationOpen(event, Date.now())) return { error: "Registration is closed for this event." };
  const team = viewer.team!;
  await db.batch([
    db.insert(eventRegistrations).values({ eventId: event.id, teamId: team.id, roster: [], registeredBy: member.id }).onConflictDoNothing(),
    db.insert(auditLog).values(auditEntry({ teamId: team.id, actorId: member.id, action: "event.register", targetId: event.id, meta: { title: event.title } })),
  ]);
  revalidateEvent(event.slug);
  return { ok: `${team.tag} is registered.` };
}

export async function unregisterTeam(slug: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await authorizeEvent(slug, "event.register");
  if ("error" in ctx) return { error: ctx.error };
  const { db, member, event, viewer } = ctx;
  const team = viewer.team!;
  if (String(form.get("confirm") ?? "").toUpperCase() !== team.tag) return { error: `Type ${team.tag} to confirm.` };
  if (!registrationOpen(event, Date.now())) return { error: "This event has ended; the registration can't change." };
  await db.batch([
    db.delete(challenges).where(and(eq(challenges.eventId, event.id), eq(challenges.teamId, team.id))),
    db.delete(eventRegistrations).where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.teamId, team.id))),
    db.insert(auditLog).values(auditEntry({ teamId: team.id, actorId: member.id, action: "event.unregister", targetId: event.id, meta: { title: event.title } })),
  ]);
  revalidateEvent(event.slug);
  return { ok: "Withdrawn. The war room was cleared." };
}

export async function setRoster(slug: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await authorizeEvent(slug, "event.roster");
  if ("error" in ctx) return { error: ctx.error };
  const { db, member, event, viewer } = ctx;
  const team = viewer.team!;
  if (!(await findRegistration(db, event.id, team.id))) return { error: "Register the team first." };
  const picked = [...new Set(form.getAll("roster").map(String))].slice(0, 100);
  const memberIds = new Set(
    (await db.select({ id: teamMembers.userId }).from(teamMembers).where(eq(teamMembers.teamId, team.id))).map((r) => r.id),
  );
  if (picked.some((id) => !memberIds.has(id))) return { error: "The roster can only include current team members." };
  await db.batch([
    db.update(eventRegistrations).set({ roster: picked }).where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.teamId, team.id))),
    db.insert(auditLog).values(auditEntry({ teamId: team.id, actorId: member.id, action: "event.roster", targetId: event.id, meta: { title: event.title, count: picked.length } })),
  ]);
  revalidateEvent(event.slug);
  return { ok: `Roster saved (${picked.length} playing).` };
}

/** 404 helper for pages, kept here so the not-found rule lives next to the actions. */
export async function assertSlug(slug: string) {
  if (!slugParamSchema.safeParse(slug).success) notFound();
}
```
Notes for the implementer: `ActionState` is exported as an `interface` from `src/app/teams/actions.ts` (a `"use server"` file). Type-only imports from it are fine. If Next rejects non-function exports from `"use server"` files at build, move `ActionState` to `src/lib/actions/state.ts` and import it from there in both action files. `db.$count` exists in Drizzle 0.45; if typecheck rejects it, use `(await db.select({ n: count() }).from(eventRegistrations).where(...))[0].n`. Remove `assertSlug` if unused after Step 6.

- [ ] **Step 4: Time components** — `src/components/events/LocalTime.tsx`

```tsx
"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** Server renders UTC; after hydration the viewer sees their own timezone. */
export function LocalTime({ iso, mode = "datetime" }: { iso: string; mode?: "datetime" | "time" }) {
  const client = useSyncExternalStore(noop, () => true, () => false);
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions =
    mode === "time" ? { hour: "2-digit", minute: "2-digit" } : { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" };
  const text = client ? d.toLocaleString(undefined, opts) : `${d.toLocaleString("en-GB", { ...opts, timeZone: "UTC" })} UTC`;
  return <time dateTime={iso}>{text}</time>;
}
```

`src/components/events/Countdown.tsx`

```tsx
"use client";

import { useSyncExternalStore } from "react";
import { formatCountdown } from "@/lib/events/timing";

const subscribe = (cb: () => void) => {
  const id = setInterval(cb, 1000);
  return () => clearInterval(id);
};
const nowSec = () => Math.floor(Date.now() / 1000);

/** Ticking "02:14:09" until `targetIso`; renders nothing on the server. */
export function Countdown({ targetIso, prefix }: { targetIso: string; prefix: string }) {
  const sec = useSyncExternalStore(subscribe, nowSec, () => null);
  if (sec === null) return null;
  const ms = new Date(targetIso).getTime() - sec * 1000;
  if (ms <= 0) return null;
  return (
    <span className="font-mono tabular-nums">
      {prefix} {formatCountdown(ms)}
    </span>
  );
}
```

`src/components/events/PhaseBadge.tsx`

```tsx
import type { EventPhase } from "@/lib/events/timing";

const style: Record<EventPhase, string> = {
  live: "border-red/60 text-red-bright",
  upcoming: "border-green/50 text-green-bright",
  past: "border-line-strong text-fg-muted",
};

export function PhaseBadge({ phase }: { phase: EventPhase }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-xs ${style[phase]}`}>
      {phase === "live" && <span className="live-dot" aria-hidden="true" />}
      {phase}
    </span>
  );
}
```

`src/components/events/ArenaBadge.tsx`

```tsx
/** Marks events hosted on our own CTF arena (separate product, own subdomain). */
export const ARENA_HOST = "arena.securityexile.com";

export function isArenaUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    return new URL(url).host === ARENA_HOST;
  } catch {
    return false;
  }
}

export function ArenaBadge() {
  return <span className="rounded border border-green/60 bg-green/10 px-2 py-0.5 font-mono text-xs text-green-bright">Security Exile Arena</span>;
}
```

- [ ] **Step 5: EventCard + EventForm**

`src/components/events/EventCard.tsx`

```tsx
import Link from "next/link";
import { EmblemBadge } from "@/components/teams/EmblemBadge";
import type { EventRow } from "@/lib/events/queries";
import type { EventPhase } from "@/lib/events/timing";
import { ArenaBadge, isArenaUrl } from "./ArenaBadge";
import { Countdown } from "./Countdown";
import { LocalTime } from "./LocalTime";
import { PhaseBadge } from "./PhaseBadge";

export function EventCard({ e, phase, ownerTag, ownerLogo, teams }: { e: EventRow; phase: EventPhase; ownerTag: string | null; ownerLogo: string | null; teams: number }) {
  return (
    <Link href={`/events/${e.slug}`} className="block rounded border border-line bg-bg-deep/60 p-4 transition-colors hover:border-green-bright">
      <div className="flex flex-wrap items-center gap-2">
        <PhaseBadge phase={phase} />
        <span className="font-mono text-xs text-fg-muted">{e.kind === "ctf" ? `ctf${e.format ? ` / ${e.format}` : ""}` : "community"}</span>
        {isArenaUrl(e.url) && <ArenaBadge />}
        {e.hiddenAt && <span className="font-mono text-xs text-red-bright">hidden</span>}
      </div>
      <h3 className="mt-2 text-lg text-fg">{e.title}</h3>
      <p className="mt-1 text-sm text-fg-muted">
        <LocalTime iso={e.startsAt.toISOString()} /> to <LocalTime iso={e.endsAt.toISOString()} />
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-fg-muted">
        {phase === "upcoming" && <Countdown targetIso={e.startsAt.toISOString()} prefix="starts in" />}
        {phase === "live" && <Countdown targetIso={e.endsAt.toISOString()} prefix="ends in" />}
        {e.kind === "ctf" && <span>{teams === 1 ? "1 team" : `${teams} teams`}</span>}
        {ownerTag && (
          <span className="ml-auto inline-flex items-center gap-1.5">
            <EmblemBadge emblem={ownerLogo} size={18} /> added by {ownerTag}
          </span>
        )}
      </div>
    </Link>
  );
}
```

`src/components/events/EventForm.tsx`

```tsx
"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/app/teams/actions";
import { FormMessage, inputCls, labelCls, SubmitButton } from "@/components/teams/FormBits";

type Defaults = { title?: string; kind?: "ctf" | "community"; format?: string; url?: string; description?: string; startsAt?: string; endsAt?: string };

/** ISO instant → value for <input type="datetime-local"> in the browser's zone. */
function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}
/** datetime-local value (browser zone) → ISO instant the server can trust. */
function toIso(local: string) {
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function EventForm({
  action,
  defaults = {},
  limited = false,
  submitLabel,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  defaults?: Defaults;
  /** event has started: only end time and link are editable */
  limited?: boolean;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const [start, setStart] = useState(toLocalInput(defaults.startsAt));
  const [end, setEnd] = useState(toLocalInput(defaults.endsAt));
  const f = { ...defaults, ...state.fields };

  return (
    <form action={formAction} className="space-y-5">
      {limited && <p className="text-sm text-fg-muted">This event has started, so only the end time and link can change.</p>}
      <div>
        <label htmlFor="title" className={labelCls}>Title</label>
        <input id="title" name="title" required minLength={3} maxLength={80} defaultValue={f.title} disabled={limited} className={`${inputCls} mt-1`} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="kind" className={labelCls}>Kind</label>
          <select id="kind" name="kind" defaultValue={f.kind ?? "ctf"} disabled={limited} className={`${inputCls} mt-1`}>
            <option value="ctf">CTF (teams register, war room)</option>
            <option value="community">Community event (workshop, talk, study session)</option>
          </select>
        </div>
        <div>
          <label htmlFor="format" className={labelCls}>Format (optional)</label>
          <input id="format" name="format" maxLength={30} placeholder="jeopardy, attack-defense…" defaultValue={f.format} disabled={limited} className={`${inputCls} mt-1`} />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="startsLocal" className={labelCls}>Starts (your local time)</label>
          <input id="startsLocal" type="datetime-local" required value={start} onChange={(e) => setStart(e.target.value)} disabled={limited} className={`${inputCls} mt-1`} />
          <input type="hidden" name="startsAt" value={limited ? (defaults.startsAt ?? "") : toIso(start)} />
        </div>
        <div>
          <label htmlFor="endsLocal" className={labelCls}>Ends (your local time)</label>
          <input id="endsLocal" type="datetime-local" required value={end} onChange={(e) => setEnd(e.target.value)} className={`${inputCls} mt-1`} />
          <input type="hidden" name="endsAt" value={toIso(end)} />
        </div>
      </div>
      <div>
        <label htmlFor="url" className={labelCls}>Link (optional)</label>
        <input id="url" name="url" type="url" maxLength={500} placeholder="https://" defaultValue={f.url} className={`${inputCls} mt-1`} />
      </div>
      <div>
        <label htmlFor="description" className={labelCls}>Description (optional)</label>
        <textarea id="description" name="description" rows={5} maxLength={2000} defaultValue={f.description} disabled={limited} className={`${inputCls} mt-1`} />
      </div>
      <FormMessage state={state} />
      <SubmitButton pending="saving…">{submitLabel}</SubmitButton>
    </form>
  );
}
```
Note: disabled inputs aren't submitted; in `limited` mode `updateEvent` only reads `url` and `endsAt`, so that's intended. Add `fields?: Record<string,string>` usage: `createEvent` returns `fields`, the form merges them.

- [ ] **Step 6: Board page** — replace `src/app/events/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { CursorHeading } from "@/components/fx/CursorHeading";
import { NeonButton } from "@/components/ui/NeonButton";
import { EventCard } from "@/components/events/EventCard";
import { getDb } from "@/lib/db/client";
import { canEvent } from "@/lib/events/permissions";
import { actorFor, loadViewer } from "@/lib/events/context";
import { listBoard } from "@/lib/events/queries";
import { eventPhase, type EventPhase } from "@/lib/events/timing";

export const metadata: Metadata = { title: "Events", description: "Upcoming CTFs and community events." };

const TABS: EventPhase[] = ["live", "upcoming", "past"];

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ tab?: string; kind?: string }> }) {
  await connection();
  const sp = await searchParams;
  const db = getDb();
  const viewer = await loadViewer(db);
  const now = Date.now();
  const rows = await listBoard(db, { includeHidden: viewer.staff });
  const visible = rows.filter((r) => !r.event.hiddenAt || viewer.staff || r.event.ownerTeamId === viewer.team?.id);
  const withPhase = visible.map((r) => ({ ...r, phase: eventPhase(r.event, now) }));
  const counts = Object.fromEntries(TABS.map((t) => [t, withPhase.filter((r) => r.phase === t).length])) as Record<EventPhase, number>;
  const tab: EventPhase = TABS.includes(sp.tab as EventPhase) ? (sp.tab as EventPhase) : counts.live > 0 ? "live" : "upcoming";
  const kind = sp.kind === "ctf" || sp.kind === "community" ? sp.kind : null;
  let list = withPhase.filter((r) => r.phase === tab && (!kind || r.event.kind === kind));
  if (tab === "past") list = list.reverse().slice(0, 50);

  const href = (t: EventPhase, k: string | null) => `/events?tab=${t}${k ? `&kind=${k}` : ""}`;
  return (
    <section className="mx-auto max-w-5xl px-4 pt-16 sm:px-6">
      <div className="flex flex-wrap items-end gap-4">
        <CursorHeading level={1} prompt="#">events</CursorHeading>
        {canEvent(actorFor(viewer, null), "event.create") && (
          <div className="ml-auto"><NeonButton href="/events/new">add an event</NeonButton></div>
        )}
      </div>
      <nav aria-label="Event filters" className="mt-8 flex flex-wrap items-center gap-2 font-mono text-sm">
        {TABS.map((t) => (
          <Link key={t} href={href(t, kind)} aria-current={t === tab ? "page" : undefined}
            className={`rounded border px-3 py-1 ${t === tab ? "border-green-bright text-green-bright" : "border-line-strong text-fg-muted hover:text-fg"}`}>
            {t} ({counts[t]})
          </Link>
        ))}
        <span className="mx-2 text-line-strong" aria-hidden="true">|</span>
        {[null, "ctf", "community"].map((k) => (
          <Link key={k ?? "all"} href={href(tab, k)} aria-current={k === kind ? "page" : undefined}
            className={k === kind ? "text-green-bright" : "text-fg-muted hover:text-fg"}>
            {k ?? "all"}
          </Link>
        ))}
      </nav>
      {list.length === 0 ? (
        <p className="mt-10 text-fg-muted">
          {tab === "live" ? "Nothing is running right now." : tab === "upcoming" ? "No upcoming events yet." : "No past events yet."}{" "}
          {canEvent(actorFor(viewer, null), "event.create") ? "Add one so your community can plan around it." : "Team captains can add events."}
        </p>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {list.map((r) => (
            <EventCard key={r.event.id} e={r.event} phase={r.phase} ownerTag={r.ownerTag} ownerLogo={r.ownerLogo} teams={r.teams} />
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 7: New-event page** — `src/app/events/new/page.tsx`

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CursorHeading } from "@/components/fx/CursorHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { EventForm } from "@/components/events/EventForm";
import { requireMember } from "@/lib/auth/member";
import { getDb } from "@/lib/db/client";
import { canEvent } from "@/lib/events/permissions";
import { findMembershipOf } from "@/lib/teams/queries";
import { createEvent } from "../actions";

export const metadata: Metadata = { title: "Add an event" };

export default async function NewEventPage() {
  const member = await requireMember();
  const membership = await findMembershipOf(getDb(), member.id);
  if (!canEvent({ teamRole: membership?.role ?? null, ownsEvent: false, platformRole: member.platformRole }, "event.create")) redirect("/events");
  return (
    <article className="mx-auto max-w-2xl px-4 pt-16 sm:px-6">
      <CursorHeading level={1} prompt="#">add an event</CursorHeading>
      <p className="mt-4 text-sm text-fg-muted">Your team ({membership!.team.tag}) is listed as the organizer and can edit it later.</p>
      <GlassPanel className="mt-8 p-6">
        <EventForm action={createEvent} submitLabel="add event" />
      </GlassPanel>
    </article>
  );
}
```

- [ ] **Step 8: Event page + actions UI**

`src/app/events/[slug]/EventActions.tsx`

```tsx
"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/app/teams/actions";
import { FormMessage, inputCls, SubmitButton } from "@/components/teams/FormBits";
import { deleteEvent, registerTeam, setEventHidden, setRoster, unregisterTeam } from "../actions";

export function RegisterButton({ slug }: { slug: string }) {
  const [state, action] = useActionState<ActionState, FormData>(() => registerTeam(slug), {});
  return (
    <form action={action} className="space-y-2">
      <SubmitButton pending="registering…">register my team</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function UnregisterForm({ slug, tag }: { slug: string; tag: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<ActionState, FormData>(unregisterTeam.bind(null, slug), {});
  if (!open)
    return <button type="button" onClick={() => setOpen(true)} className="font-mono text-xs text-fg-muted hover:text-red-bright">withdraw team</button>;
  return (
    <form action={action} className="max-w-xs space-y-2 rounded border border-red/40 p-3">
      <p className="text-xs text-fg">Withdrawing deletes your war room for this event. Type <span className="font-mono">{tag}</span> to confirm.</p>
      <label htmlFor="confirm-unreg" className="sr-only">Team tag</label>
      <input id="confirm-unreg" name="confirm" autoComplete="off" className={inputCls} />
      <FormMessage state={state} />
      <SubmitButton variant="danger" className="!py-1 !text-xs" pending="…">withdraw</SubmitButton>
    </form>
  );
}

export function RosterForm({ slug, members, roster }: { slug: string; members: { userId: string; handle: string | null }[]; roster: string[] }) {
  const [state, action] = useActionState<ActionState, FormData>(setRoster.bind(null, slug), {});
  return (
    <form action={action} className="space-y-3">
      <fieldset>
        <legend className="text-sm text-fg-muted">Who&apos;s playing</legend>
        <div className="mt-2 grid gap-1 sm:grid-cols-2">
          {members.map((m) => (
            <label key={m.userId} className="flex items-center gap-2 font-mono text-sm">
              <input type="checkbox" name="roster" value={m.userId} defaultChecked={roster.includes(m.userId)} /> @{m.handle}
            </label>
          ))}
        </div>
      </fieldset>
      <FormMessage state={state} />
      <SubmitButton variant="ghost" pending="saving…">save roster</SubmitButton>
    </form>
  );
}

export function HideToggle({ slug, hidden }: { slug: string; hidden: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(() => setEventHidden(slug, !hidden), {});
  return (
    <form action={action} className="flex items-center gap-3">
      <SubmitButton variant={hidden ? "ghost" : "danger"} className="!py-1 !text-xs" pending="…">{hidden ? "restore event" : "hide event"}</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function DeleteEventForm({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<ActionState, FormData>(deleteEvent.bind(null, slug), {});
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="font-mono text-xs text-fg-muted hover:text-red-bright">delete event</button>;
  return (
    <form action={action} className="max-w-xs space-y-2 rounded border border-red/40 p-3">
      <p className="text-xs text-fg">Type <span className="font-mono">{slug}</span> to delete this event.</p>
      <label htmlFor="confirm-del" className="sr-only">Event slug</label>
      <input id="confirm-del" name="confirm" autoComplete="off" className={inputCls} />
      <FormMessage state={state} />
      <SubmitButton variant="danger" className="!py-1 !text-xs" pending="…">delete</SubmitButton>
    </form>
  );
}
```

`src/app/events/[slug]/page.tsx`

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CursorHeading } from "@/components/fx/CursorHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { NeonButton } from "@/components/ui/NeonButton";
import { EmblemBadge } from "@/components/teams/EmblemBadge";
import { ArenaBadge, isArenaUrl } from "@/components/events/ArenaBadge";
import { Countdown } from "@/components/events/Countdown";
import { LocalTime } from "@/components/events/LocalTime";
import { PhaseBadge } from "@/components/events/PhaseBadge";
import { getDb } from "@/lib/db/client";
import { actorFor, canSeeEvent, loadViewer } from "@/lib/events/context";
import { canEvent, deleteAllowed } from "@/lib/events/permissions";
import { findEventBySlug, listRegisteredTeams } from "@/lib/events/queries";
import { eventPhase, registrationOpen } from "@/lib/events/timing";
import { slugParamSchema } from "@/lib/events/validation";
import { listRoster } from "@/lib/teams/queries";
import { DeleteEventForm, HideToggle, RegisterButton, RosterForm, UnregisterForm } from "./EventActions";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: slugParamSchema.safeParse(slug).success ? slug : "Event" };
}

export default async function EventPage({ params }: Props) {
  await connection();
  const { slug } = await params;
  if (!slugParamSchema.safeParse(slug).success) notFound();
  const db = getDb();
  const [event, viewer] = await Promise.all([findEventBySlug(db, slug), loadViewer(db)]);
  if (!event || !canSeeEvent(event, viewer)) notFound();

  const now = Date.now();
  const phase = eventPhase(event, now);
  const actor = actorFor(viewer, event);
  const registered = event.kind === "ctf" ? await listRegisteredTeams(db, event.id) : [];
  const mine = viewer.team ? registered.find((r) => r.teamId === viewer.team!.id) : undefined;
  const othersRegistered = registered.filter((r) => r.teamId !== viewer.team?.id).length;
  const roster = mine && canEvent(actor, "event.roster") ? await listRoster(db, viewer.team!.id) : [];

  return (
    <article className="mx-auto max-w-4xl px-4 pt-16 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <PhaseBadge phase={phase} />
        <span className="font-mono text-xs text-fg-muted">{event.kind === "ctf" ? `ctf${event.format ? ` / ${event.format}` : ""}` : "community event"}</span>
        {isArenaUrl(event.url) && <ArenaBadge />}
        {event.hiddenAt && <span className="font-mono text-xs text-red-bright">hidden from the board</span>}
      </div>
      <CursorHeading level={1} prompt="#" className="mt-3">{event.title}</CursorHeading>
      <p className="mt-4 text-fg-muted">
        <LocalTime iso={event.startsAt.toISOString()} /> to <LocalTime iso={event.endsAt.toISOString()} />{" "}
        {phase === "upcoming" && <Countdown targetIso={event.startsAt.toISOString()} prefix="· starts in" />}
        {phase === "live" && <Countdown targetIso={event.endsAt.toISOString()} prefix="· ends in" />}
      </p>
      {event.url && (
        <p className="mt-2">
          <a href={event.url} target="_blank" rel="noopener noreferrer nofollow" className="text-green-bright underline-offset-4 hover:underline">{event.url}</a>
        </p>
      )}
      {event.description && <p className="mt-6 whitespace-pre-line text-fg">{event.description}</p>}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {mine && <NeonButton href={`/events/${event.slug}/war-room`}>open war room</NeonButton>}
        {!mine && event.kind === "ctf" && registrationOpen(event, now) && canEvent(actor, "event.register") && <RegisterButton slug={event.slug} />}
        {!viewer.member && event.kind === "ctf" && registrationOpen(event, now) && <NeonButton href="/sign-in" variant="ghost">sign in to register your team</NeonButton>}
        {canEvent(actor, "event.edit") && <NeonButton href={`/events/${event.slug}/edit`} variant="ghost">edit event</NeonButton>}
        {canEvent(actor, "event.delete") && deleteAllowed(phase, othersRegistered) && <DeleteEventForm slug={event.slug} />}
        {canEvent(actor, "event.hide") && <HideToggle slug={event.slug} hidden={!!event.hiddenAt} />}
      </div>

      {mine && canEvent(actor, "event.roster") && (
        <GlassPanel className="mt-8 space-y-4 p-6">
          <RosterForm slug={event.slug} members={roster.map((r) => ({ userId: r.userId, handle: r.handle }))} roster={mine.roster} />
          {registrationOpen(event, now) && <UnregisterForm slug={event.slug} tag={viewer.team!.tag} />}
        </GlassPanel>
      )}

      {event.kind === "ctf" && (
        <section className="mt-10">
          <h2 className="font-mono text-green">registered teams ({registered.length})</h2>
          {registered.length === 0 ? (
            <p className="mt-3 text-sm text-fg-muted">No teams yet.</p>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {registered.map((t) => (
                <li key={t.teamId}>
                  <Link href={`/teams/${t.tag}`} className="flex items-center gap-3 rounded border border-line p-2 hover:border-green-bright">
                    <EmblemBadge emblem={t.logoKey} size={28} />
                    <span className="font-mono text-sm text-fg">{t.tag}</span>
                    <span className="truncate text-sm text-fg-muted">{t.name}</span>
                    {t.roster.length > 0 && <span className="ml-auto font-mono text-xs text-fg-muted">{t.roster.length} playing</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </article>
  );
}
```
If `CursorHeading` doesn't accept `className`, wrap it in a `<div className="mt-3">` instead.

`src/app/events/[slug]/edit/page.tsx`

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CursorHeading } from "@/components/fx/CursorHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { EventForm } from "@/components/events/EventForm";
import { requireMember } from "@/lib/auth/member";
import { getDb } from "@/lib/db/client";
import { actorFor, loadViewer } from "@/lib/events/context";
import { canEvent } from "@/lib/events/permissions";
import { findEventBySlug } from "@/lib/events/queries";
import { eventPhase } from "@/lib/events/timing";
import { slugParamSchema } from "@/lib/events/validation";
import { updateEvent } from "../../actions";

export const metadata: Metadata = { title: "Edit event" };

export default async function EditEventPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireMember();
  const { slug } = await params;
  if (!slugParamSchema.safeParse(slug).success) notFound();
  const db = getDb();
  const [event, viewer] = await Promise.all([findEventBySlug(db, slug), loadViewer(db)]);
  if (!event || !canEvent(actorFor(viewer, event), "event.edit")) notFound();
  const limited = eventPhase(event, Date.now()) !== "upcoming";
  return (
    <article className="mx-auto max-w-2xl px-4 pt-16 sm:px-6">
      <CursorHeading level={1} prompt="#">edit event</CursorHeading>
      <GlassPanel className="mt-8 p-6">
        <EventForm
          action={updateEvent.bind(null, event.slug)}
          limited={limited}
          submitLabel="save changes"
          defaults={{
            title: event.title,
            kind: event.kind,
            format: event.format ?? "",
            url: event.url ?? "",
            description: event.description ?? "",
            startsAt: event.startsAt.toISOString(),
            endsAt: event.endsAt.toISOString(),
          }}
        />
      </GlassPanel>
    </article>
  );
}
```

- [ ] **Step 9: Verify**

Run: `npm run typecheck && npm run lint && npm test` → pass. Start dev: `npm run dev -- --port 3210` (background). In the browser (signed in as a captain): add an event starting in 1 hour → lands on `/events/<slug>`; times show in your zone; register; set roster; edit title; `/events` shows it under upcoming. Check the DB value: `npx wrangler d1 execute DB --local --command "select title, starts_at from events"` → `starts_at` equals the instant you typed converted to UTC (Review Focus 2). As a non-captain account (impersonation), `/events/new` redirects to `/events` and no edit/register buttons show.

- [ ] **Step 10: Commit**

```bash
git add src/lib/events src/app/events src/components/events
git commit -m "feat(events): board, event pages, registration, rosters"
```

---

### Task 8: Markdown sanitize + view

**Files:**
- Create: `src/components/markdown/sanitize.ts`, `src/components/markdown/sanitize.test.ts`, `src/components/markdown/MarkdownView.tsx`, `src/components/markdown/MarkdownInner.tsx`
- Modify: `package.json` (deps), `vitest` config only if a DOM env is missing

**Interfaces:**
- Produces: `renderMarkdown(src: string, purify: DOMPurifyLike): string`; `<MarkdownView source={string} />` (client; renders plain text on the server, sanitized HTML after load).

- [ ] **Step 1: Install** — `npm install marked dompurify` and `npm install -D jsdom` (test-only DOM for DOMPurify).

- [ ] **Step 2: Failing tests** — `src/components/markdown/sanitize.test.ts`

```ts
// @vitest-environment jsdom
import DOMPurify from "dompurify";
import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./sanitize";

const r = (s: string) => renderMarkdown(s, DOMPurify);

describe("renderMarkdown", () => {
  it("renders basic markdown", () => expect(r("**bold** `code`")).toContain("<strong>bold</strong>"));
  it("drops script tags", () => expect(r("<script>alert(1)</script>hi")).not.toContain("<script"));
  it("drops raw html entirely", () => expect(r('<img src=x onerror="alert(1)">')).not.toContain("<img"));
  it("neutralizes javascript: links", () => expect(r("[x](javascript:alert(1))")).not.toMatch(/href="javascript/i));
  it("hardens external links", () => {
    const html = r("[site](https://example.com)");
    expect(html).toContain('rel="noopener noreferrer nofollow"');
    expect(html).toContain('target="_blank"');
  });
  it("keeps code blocks", () => expect(r("```\nls -la\n```")).toContain("<pre><code>ls -la"));
});
```
Run: `npx vitest run src/components/markdown/sanitize.test.ts` → FAIL.

- [ ] **Step 3: Implement** — `src/components/markdown/sanitize.ts`

```ts
import { Marked } from "marked";

/** Minimal DOMPurify surface we use (lets tests pass a jsdom-backed instance). */
export interface DOMPurifyLike {
  sanitize(html: string, cfg: Record<string, unknown>): string;
  addHook(name: "afterSanitizeAttributes", fn: (node: Element) => void): void;
  removeHook(name: "afterSanitizeAttributes"): unknown;
}

// Raw HTML in notes is never rendered; markdown syntax only.
const md = new Marked({ gfm: true, breaks: true, renderer: { html: () => "" } });

const ALLOWED_TAGS = ["p", "br", "strong", "em", "del", "code", "pre", "blockquote", "ul", "ol", "li", "a", "h1", "h2", "h3", "h4", "hr", "table", "thead", "tbody", "tr", "th", "td"];

export function renderMarkdown(src: string, purify: DOMPurifyLike): string {
  const raw = md.parse(src, { async: false }) as string;
  purify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer nofollow");
    }
  });
  try {
    return purify.sanitize(raw, { ALLOWED_TAGS, ALLOWED_ATTR: ["href", "target", "rel"], ALLOWED_URI_REGEXP: /^https?:/i });
  } finally {
    purify.removeHook("afterSanitizeAttributes");
  }
}
```

- [ ] **Step 4: Run** — test → PASS.

- [ ] **Step 5: Client view (no server-side DOMPurify)**

`src/components/markdown/MarkdownInner.tsx`

```tsx
"use client";

import DOMPurify from "dompurify";
import { useMemo } from "react";
import { renderMarkdown } from "./sanitize";

export default function MarkdownInner({ source }: { source: string }) {
  const html = useMemo(() => renderMarkdown(source, DOMPurify), [source]);
  // Sanitized above with an allow-list; raw HTML was dropped before sanitizing.
  return <div className="md-notes" dangerouslySetInnerHTML={{ __html: html }} />;
}
```

`src/components/markdown/MarkdownView.tsx`

```tsx
"use client";

import dynamic from "next/dynamic";

/** Browser-only: DOMPurify needs a DOM, and loading it here keeps it out of the Worker bundle. */
const Inner = dynamic(() => import("./MarkdownInner"), {
  ssr: false,
  loading: () => null,
});

export function MarkdownView({ source }: { source: string }) {
  if (!source.trim()) return <p className="text-sm text-fg-muted">No notes yet.</p>;
  return (
    <>
      <noscript>
        <pre className="whitespace-pre-wrap text-sm">{source}</pre>
      </noscript>
      <Inner source={source} />
    </>
  );
}
```
Add minimal styles to `src/app/globals.css`:

```css
.md-notes { font-size: 0.875rem; line-height: 1.6; color: var(--color-fg); }
.md-notes :where(p, ul, ol, pre, blockquote, table) { margin-block: 0.5rem; }
.md-notes ul { list-style: disc; padding-left: 1.25rem; }
.md-notes ol { list-style: decimal; padding-left: 1.25rem; }
.md-notes a { color: var(--color-green-bright); text-decoration: underline; text-underline-offset: 3px; }
.md-notes code { font-family: var(--font-mono); font-size: 0.8125rem; }
.md-notes pre { overflow-x: auto; padding: 0.75rem; border: 1px solid var(--color-line); border-radius: 4px; background: var(--color-bg-deep); }
.md-notes blockquote { border-left: 2px solid var(--color-line-strong); padding-left: 0.75rem; color: var(--color-fg-muted); }
```
(Check the token names in `globals.css` `@theme inline` and match them; use the existing `--color-*` names.)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/components/markdown src/app/globals.css
git commit -m "feat: sanitized markdown view for war-room notes"
```

---

### Task 9: War-room actions (challenges, moves, notes)

**Files:**
- Create: `src/app/events/[slug]/war-room/actions.ts`, `src/lib/events/war-room.ts`

**Interfaces:**
- Consumes: Tasks 3–8.
- Produces:
```ts
// src/lib/events/war-room.ts
export async function loadWarRoom(slugRaw: string, opts: { forWrite: boolean }):
  Promise<{ error: string } | { db: Db; member: OnboardedMember; event: EventRow; team: Team; teamRole: TeamRole; registration: Registration; writable: boolean }>;
// actions.ts
addChallenge(slug, _prev, form): Promise<ActionState>
moveChallenge(slug, challengeId, move: Move): Promise<ActionState>
saveChallengeNotes(slug, challengeId, _prev, form): Promise<ActionState>
deleteChallenge(slug, challengeId): Promise<ActionState>
saveTeamNotes(slug, _prev, form): Promise<ActionState & { savedAt?: number }>
```

- [ ] **Step 1: Loader** — `src/lib/events/war-room.ts`

```ts
import "server-only";
import { requireMember } from "@/lib/auth/member";
import { getDb } from "@/lib/db/client";
import { findMembershipOf } from "@/lib/teams/queries";
import { findEventBySlug, findRegistration } from "./queries";
import { warRoomWritable } from "./timing";
import { slugParamSchema } from "./validation";

/**
 * Loads the viewer's war room. Any failure returns the same "not found" error,
 * so outsiders can't learn whether a team is registered.
 */
export async function loadWarRoom(slugRaw: string, opts: { forWrite: boolean }) {
  const member = await requireMember();
  const notFound = { error: "War room not found." } as const;
  const slug = slugParamSchema.safeParse(slugRaw);
  if (!slug.success) return notFound;
  const db = getDb();
  const [event, membership] = await Promise.all([findEventBySlug(db, slug.data), findMembershipOf(db, member.id)]);
  if (!event || event.kind !== "ctf" || !membership) return notFound;
  const registration = await findRegistration(db, event.id, membership.team.id);
  if (!registration) return notFound;
  const writable = warRoomWritable(event, Date.now());
  if (opts.forWrite && !writable) return { error: "This war room is read-only now that the event is over." } as const;
  return { db, member, event, team: membership.team, teamRole: membership.role, registration, writable } as const;
}
```

- [ ] **Step 2: Actions** — `src/app/events/[slug]/war-room/actions.ts`

```ts
"use server";

/*
 * War-room mutations. Every action: loadWarRoom (member of a registered team, room writable)
 * → rate limit → Zod → conditional write → revalidate. Status changes use
 * UPDATE … WHERE status = <expected>, so concurrent clicks can't both win.
 */
import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { getEnv } from "@/lib/db/client";
import { newId } from "@/lib/db/ids";
import { challenges, eventRegistrations, users } from "@/lib/db/schema";
import { MOVES, nextStatus, type Move } from "@/lib/events/permissions";
import { loadWarRoom } from "@/lib/events/war-room";
import { challengeInputSchema, challengeNotesSchema, parseLinks, teamNotesSchema } from "@/lib/events/validation";
import { hit, LIMITS, retryMessage } from "@/lib/security/rate-limit";
import type { ActionState } from "@/app/teams/actions";

const firstIssue = (e: { issues: { message: string }[] }) => e.issues[0]?.message ?? "Invalid input.";
const isUnique = (e: unknown) => String(e).includes("UNIQUE");
const idOk = (id: string) => /^[0-9A-Z]{26}$/.test(id);

async function writeLimit(memberId: string) {
  const rl = await hit(getEnv().KV, `war-write:${memberId}`, LIMITS.warRoomWrite);
  return rl.ok ? null : retryMessage(rl);
}

export async function addChallenge(slug: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await loadWarRoom(slug, { forWrite: true });
  if ("error" in ctx) return { error: ctx.error };
  const { db, member, event, team } = ctx;
  const fields = { name: String(form.get("name") ?? ""), points: String(form.get("points") ?? "") };
  const parsed = challengeInputSchema.safeParse({ ...fields, category: form.get("category") });
  if (!parsed.success) return { error: firstIssue(parsed.error), fields };
  const rl = await hit(getEnv().KV, `chal-create:${member.id}`, LIMITS.challengeCreate);
  if (!rl.ok) return { error: retryMessage(rl), fields };
  try {
    await db.insert(challenges).values({
      id: newId(),
      eventId: event.id,
      teamId: team.id,
      name: parsed.data.name,
      category: parsed.data.category,
      points: parsed.data.points,
      createdBy: member.id,
    });
  } catch (e) {
    if (isUnique(e)) return { error: "Your team already has a challenge with that name.", fields };
    throw e;
  }
  revalidatePath(`/events/${event.slug}/war-room`);
  return { ok: `Added ${parsed.data.name}.` };
}

export async function moveChallenge(slug: string, challengeId: string, move: Move): Promise<ActionState> {
  if (!idOk(challengeId) || !(MOVES as readonly string[]).includes(move)) return { error: "Unknown challenge." };
  const ctx = await loadWarRoom(slug, { forWrite: true });
  if ("error" in ctx) return { error: ctx.error };
  const { db, member, event, team, teamRole } = ctx;
  const limited = await writeLimit(member.id);
  if (limited) return { error: limited };

  const current = await db.query.challenges.findFirst({
    where: and(eq(challenges.id, challengeId), eq(challenges.eventId, event.id), eq(challenges.teamId, team.id)),
  });
  if (!current) return { error: "Unknown challenge." };
  const isLead = teamRole === "captain" || teamRole === "co_captain";
  const to = nextStatus(current.status, move, { isClaimer: current.claimedBy === member.id, isLead });
  if (!to) return { error: "That move isn't available. Refresh to see the latest board." };

  const patch =
    to === "open"
      ? { status: to, claimedBy: null, solvedAt: null }
      : to === "claimed"
        ? { status: to, claimedBy: member.id }
        : to === "solved"
          ? { status: to, solvedAt: new Date(), claimedBy: current.claimedBy ?? member.id }
          : { status: to };

  const res = await db
    .update(challenges)
    .set(patch)
    .where(and(eq(challenges.id, current.id), eq(challenges.teamId, team.id), eq(challenges.status, current.status)));
  if (res.meta.changes === 0) {
    const now = await db
      .select({ status: challenges.status, claimer: users.handle })
      .from(challenges)
      .leftJoin(users, eq(users.id, challenges.claimedBy))
      .where(eq(challenges.id, current.id));
    const c = now[0];
    return { error: c?.claimer && c.status !== "open" ? `Already ${c.status} by @${c.claimer}.` : "Someone changed this challenge first. Refresh to see the latest board." };
  }
  revalidatePath(`/events/${event.slug}/war-room`);
  return {};
}

export async function saveChallengeNotes(slug: string, challengeId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  if (!idOk(challengeId)) return { error: "Unknown challenge." };
  const ctx = await loadWarRoom(slug, { forWrite: true });
  if ("error" in ctx) return { error: ctx.error };
  const { db, member, event, team } = ctx;
  const limited = await writeLimit(member.id);
  if (limited) return { error: limited };
  const notes = challengeNotesSchema.safeParse(String(form.get("notes") ?? ""));
  if (!notes.success) return { error: firstIssue(notes.error) };
  const links = parseLinks(String(form.get("links") ?? ""));
  if ("error" in links) return { error: links.error };
  const res = await db
    .update(challenges)
    .set({ notesMd: notes.data || null, links })
    .where(and(eq(challenges.id, challengeId), eq(challenges.eventId, event.id), eq(challenges.teamId, team.id)));
  if (res.meta.changes === 0) return { error: "Unknown challenge." };
  revalidatePath(`/events/${event.slug}/war-room`);
  return { ok: "Saved." };
}

export async function deleteChallenge(slug: string, challengeId: string): Promise<ActionState> {
  if (!idOk(challengeId)) return { error: "Unknown challenge." };
  const ctx = await loadWarRoom(slug, { forWrite: true });
  if ("error" in ctx) return { error: ctx.error };
  const { db, member, event, team, teamRole } = ctx;
  const current = await db.query.challenges.findFirst({ where: and(eq(challenges.id, challengeId), eq(challenges.teamId, team.id), eq(challenges.eventId, event.id)) });
  if (!current) return { error: "Unknown challenge." };
  const isLead = teamRole === "captain" || teamRole === "co_captain";
  if (!isLead && current.createdBy !== member.id) return { error: "Only the person who added it or a captain can delete a challenge." };
  await db.delete(challenges).where(and(eq(challenges.id, current.id), eq(challenges.teamId, team.id)));
  revalidatePath(`/events/${event.slug}/war-room`);
  return { ok: "Deleted." };
}

export async function saveTeamNotes(slug: string, _prev: ActionState & { savedAt?: number }, form: FormData): Promise<ActionState & { savedAt?: number }> {
  const ctx = await loadWarRoom(slug, { forWrite: true });
  if ("error" in ctx) return { error: ctx.error };
  const { db, member, event, team } = ctx;
  const limited = await writeLimit(member.id);
  if (limited) return { error: limited };
  const notes = teamNotesSchema.safeParse(String(form.get("notes") ?? ""));
  if (!notes.success) return { error: firstIssue(notes.error) };
  // The version the editor loaded; the latest save from this form wins over the page's initial value.
  const loaded = Number(_prev.savedAt ?? form.get("loadedAt") ?? 0);
  const savedAt = new Date(Math.max(Date.now(), loaded + 1));
  const res = await db
    .update(eventRegistrations)
    .set({ notesMd: notes.data, notesUpdatedAt: savedAt })
    .where(
      and(
        eq(eventRegistrations.eventId, event.id),
        eq(eventRegistrations.teamId, team.id),
        loaded > 0 ? eq(eventRegistrations.notesUpdatedAt, new Date(loaded)) : isNull(eventRegistrations.notesUpdatedAt),
      ),
    );
  if (res.meta.changes === 0) return { error: "A teammate edited these notes. Copy your text, reload, and merge.", savedAt: loaded };
  revalidatePath(`/events/${event.slug}/war-room`);
  return { ok: "Notes saved.", savedAt: savedAt.getTime() };
}
```
If `res.meta.changes` doesn't typecheck on the Drizzle D1 result, use `(res as unknown as { meta: { changes: number } }).meta.changes`, the shape D1 returns.

- [ ] **Step 3: Claim-race check against local D1** (Review Focus 1)

With the dev seed from Task 11 not yet available, insert directly:
```bash
npx wrangler d1 execute DB --local --command "insert into events(id,slug,title,starts_at,ends_at,created_at,kind) values('EV1','race-test','race',0,9999999999999,0,'ctf'); insert into challenges(id,event_id,team_id,name,status,links_json,updated_at) select 'CH1','EV1',id,'race','open','[]',0 from teams limit 1;"
npx wrangler d1 execute DB --local --command "update challenges set status='claimed', claimed_by='u1' where id='CH1' and status='open'; update challenges set status='claimed', claimed_by='u2' where id='CH1' and status='open'; select status, claimed_by from challenges where id='CH1';"
npx wrangler d1 execute DB --local --command "delete from challenges where id='CH1'; delete from events where id='EV1';"
```
Expected: `claimed | u1` — the second conditional update changed nothing. (Insert needs at least one team locally; create one in the app first if the table is empty.)

- [ ] **Step 4: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add src/lib/events/war-room.ts "src/app/events/[slug]/war-room/actions.ts"
git commit -m "feat(war-room): challenge actions with race-safe claims, notes with stale-save check"
```

---

### Task 10: War-room page and components

**Files:**
- Create in `src/app/events/[slug]/war-room/`: `page.tsx`, `Board.tsx`, `ChallengeCard.tsx`, `AddChallenge.tsx`, `NotesPanel.tsx`, `AutoRefresh.tsx`

**Interfaces:**
- Consumes: `loadWarRoom`, `listChallenges`, actions from Task 9, `MarkdownView`, `Countdown`, `PhaseBadge`, `FOCUS_CATEGORIES`.
- Produces: route `/events/[slug]/war-room`.

- [ ] **Step 1: AutoRefresh** — `AutoRefresh.tsx`

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const typing = () => {
  const el = document.activeElement;
  return el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && el.type !== "checkbox") || el instanceof HTMLSelectElement;
};

/** Re-fetches the server-rendered board every `ms` while visible, idle, and the room is writable. */
export function AutoRefresh({ ms = 10_000, enabled }: { ms?: number; enabled: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible" && !typing()) router.refresh();
    }, ms);
    return () => clearInterval(id);
  }, [enabled, ms, router]);
  return null;
}
```

- [ ] **Step 2: ChallengeCard** — `ChallengeCard.tsx`

```tsx
"use client";

import { useActionState, useState, useTransition } from "react";
import type { ActionState } from "@/app/teams/actions";
import { FormMessage, inputCls, SubmitButton } from "@/components/teams/FormBits";
import { MarkdownView } from "@/components/markdown/MarkdownView";
import { nextStatus, type ChallengeStatus, type Move } from "@/lib/events/permissions";
import { deleteChallenge, moveChallenge, saveChallengeNotes } from "./actions";

export interface CardData {
  id: string;
  name: string;
  category: string | null;
  points: number | null;
  status: ChallengeStatus;
  claimer: string | null;
  claimedByMe: boolean;
  createdByMe: boolean;
  notes: string;
  links: { label: string; url: string }[];
  solvedAtIso: string | null;
}

const LABEL: Record<Move, string> = { claim: "claim", start: "start solving", solve: "solved", release: "release", reopen: "reopen" };

export function ChallengeCard({ slug, c, isLead, writable }: { slug: string; c: CardData; isLead: boolean; writable: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionState>({});
  const [notesState, notesAction] = useActionState<ActionState, FormData>(saveChallengeNotes.bind(null, slug, c.id), {});
  const moves = (["claim", "start", "solve", "release", "reopen"] as Move[]).filter((m) => nextStatus(c.status, m, { isClaimer: c.claimedByMe, isLead }));
  const run = (fn: () => Promise<ActionState>) => start(async () => setMsg(await fn()));

  return (
    <li className="rounded border border-line bg-bg-deep/70 p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm text-fg">{c.name}</p>
          <p className="font-mono text-xs text-fg-muted">
            {c.category ?? "misc"}
            {c.points !== null && ` · ${c.points} pts`}
            {c.claimer && c.status !== "open" && ` · @${c.claimer}`}
          </p>
        </div>
      </div>
      {writable && moves.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {moves.map((m) => (
            <button key={m} type="button" disabled={pending} onClick={() => run(() => moveChallenge(slug, c.id, m))}
              className={`rounded px-2 py-0.5 font-mono text-xs disabled:opacity-60 ${m === "solve" ? "bg-green text-bg-deep hover:bg-green-bright" : "border border-line-strong text-fg hover:border-green-bright"}`}>
              {LABEL[m]}
            </button>
          ))}
        </div>
      )}
      <FormMessage state={msg} />
      <details className="mt-2">
        <summary className="cursor-pointer font-mono text-xs text-fg-muted hover:text-fg">notes & links{c.links.length > 0 && ` (${c.links.length})`}</summary>
        <div className="mt-2 space-y-3">
          <MarkdownView source={c.notes} />
          {c.links.length > 0 && (
            <ul className="space-y-1">
              {c.links.map((l) => (
                <li key={l.url}><a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="text-sm text-green-bright underline-offset-4 hover:underline">{l.label}</a></li>
              ))}
            </ul>
          )}
          {writable && (
            <form action={notesAction} className="space-y-2">
              <label htmlFor={`n-${c.id}`} className="sr-only">Notes for {c.name}</label>
              <textarea id={`n-${c.id}`} name="notes" rows={5} maxLength={10_000} defaultValue={c.notes} className={inputCls} placeholder="Markdown: findings, payloads, dead ends" />
              <label htmlFor={`l-${c.id}`} className="block text-xs text-fg-muted">Links, one per line: <span className="font-mono">label | https://…</span></label>
              <textarea id={`l-${c.id}`} name="links" rows={2} defaultValue={c.links.map((l) => `${l.label} | ${l.url}`).join("\n")} className={inputCls} />
              <FormMessage state={notesState} />
              <div className="flex items-center gap-3">
                <SubmitButton variant="ghost" className="!py-1 !text-xs" pending="saving…">save notes</SubmitButton>
                {(isLead || c.createdByMe) && (
                  <button type="button" disabled={pending} onClick={() => { if (confirm(`Delete ${c.name}?`)) run(() => deleteChallenge(slug, c.id)); }}
                    className="font-mono text-xs text-fg-muted hover:text-red-bright">delete</button>
                )}
              </div>
            </form>
          )}
        </div>
      </details>
    </li>
  );
}
```

- [ ] **Step 3: Board** (columns; tabs below `lg`) — `Board.tsx`

```tsx
"use client";

import { useState } from "react";
import type { ChallengeStatus } from "@/lib/events/permissions";
import { ChallengeCard, type CardData } from "./ChallengeCard";

const COLS: ChallengeStatus[] = ["open", "claimed", "solving", "solved"];

export function Board({ slug, cards, isLead, writable }: { slug: string; cards: CardData[]; isLead: boolean; writable: boolean }) {
  const [tab, setTab] = useState<ChallengeStatus>("open");
  const by = (s: ChallengeStatus) => cards.filter((c) => c.status === s);
  return (
    <div>
      <div role="tablist" aria-label="Challenge status" className="flex gap-2 font-mono text-xs lg:hidden">
        {COLS.map((s) => (
          <button key={s} role="tab" type="button" aria-selected={tab === s} onClick={() => setTab(s)}
            className={`rounded border px-2 py-1 ${tab === s ? "border-green-bright text-green-bright" : "border-line-strong text-fg-muted"}`}>
            {s} ({by(s).length})
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:mt-0 lg:grid-cols-4">
        {COLS.map((s) => (
          <section key={s} aria-label={`${s} challenges`} className={tab === s ? "" : "hidden lg:block"}>
            <h2 className="hidden font-mono text-sm text-green lg:block">{s} ({by(s).length})</h2>
            <ul className="mt-2 space-y-2">
              {by(s).map((c) => <ChallengeCard key={c.id} slug={slug} c={c} isLead={isLead} writable={writable} />)}
              {by(s).length === 0 && <li className="font-mono text-xs text-fg-muted">empty</li>}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: AddChallenge + NotesPanel**

`AddChallenge.tsx`

```tsx
"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/teams/actions";
import { FormMessage, inputCls, SubmitButton } from "@/components/teams/FormBits";
import { FOCUS_CATEGORIES } from "@/lib/teams/validation";
import { addChallenge } from "./actions";

export function AddChallenge({ slug }: { slug: string }) {
  const [state, action] = useActionState<ActionState, FormData>(addChallenge.bind(null, slug), {});
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[1fr_9rem_6rem_auto] sm:items-end">
      <div>
        <label htmlFor="ch-name" className="text-xs text-fg-muted">Challenge</label>
        <input id="ch-name" name="name" required maxLength={60} defaultValue={state.fields?.name} className={inputCls} />
      </div>
      <div>
        <label htmlFor="ch-cat" className="text-xs text-fg-muted">Category</label>
        <select id="ch-cat" name="category" defaultValue="web" className={inputCls}>
          {FOCUS_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="ch-pts" className="text-xs text-fg-muted">Points</label>
        <input id="ch-pts" name="points" inputMode="numeric" pattern="[0-9]*" defaultValue={state.fields?.points} className={inputCls} />
      </div>
      <SubmitButton pending="adding…">add</SubmitButton>
      <div className="sm:col-span-4"><FormMessage state={state} /></div>
    </form>
  );
}
```
Note: `FormMessage` shows `ok` too ("Added baby-rop."). `FOCUS_CATEGORIES` must be importable in a client component; `src/lib/teams/validation.ts` imports only zod and enums, which is fine.

`NotesPanel.tsx`

```tsx
"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/app/teams/actions";
import { FormMessage, inputCls, SubmitButton } from "@/components/teams/FormBits";
import { MarkdownView } from "@/components/markdown/MarkdownView";
import { saveTeamNotes } from "./actions";

export function NotesPanel({ slug, notes, updatedAt, writable }: { slug: string; notes: string; updatedAt: number; writable: boolean }) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState<ActionState & { savedAt?: number }, FormData>(saveTeamNotes.bind(null, slug), { savedAt: updatedAt });
  return (
    <section aria-label="Team notes" className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="font-mono text-sm text-green">team notes</h2>
        {writable && (
          <button type="button" onClick={() => setEditing(!editing)} className="font-mono text-xs text-fg-muted hover:text-fg">{editing ? "preview" : "edit"}</button>
        )}
      </div>
      {editing ? (
        <form action={action} className="space-y-2">
          <input type="hidden" name="loadedAt" value={updatedAt} />
          <label htmlFor="team-notes" className="sr-only">Team notes</label>
          <textarea id="team-notes" name="notes" rows={14} maxLength={20_000} defaultValue={notes} className={inputCls} placeholder="Strategy, VPN details, flag format, who's on what" />
          <FormMessage state={state} />
          <SubmitButton variant="ghost" pending="saving…">save notes</SubmitButton>
        </form>
      ) : (
        <MarkdownView source={notes} />
      )}
    </section>
  );
}
```

- [ ] **Step 5: Page** — `page.tsx`

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CursorHeading } from "@/components/fx/CursorHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Countdown } from "@/components/events/Countdown";
import { PhaseBadge } from "@/components/events/PhaseBadge";
import { listChallenges } from "@/lib/events/queries";
import { eventPhase, WAR_ROOM_GRACE_MS } from "@/lib/events/timing";
import { loadWarRoom } from "@/lib/events/war-room";
import { AddChallenge } from "./AddChallenge";
import { AutoRefresh } from "./AutoRefresh";
import { Board } from "./Board";
import type { CardData } from "./ChallengeCard";
import { NotesPanel } from "./NotesPanel";

export const metadata: Metadata = { title: "War room", robots: { index: false } };

export default async function WarRoomPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ cat?: string }> }) {
  await connection();
  const { slug } = await params;
  const { cat } = await searchParams;
  const ctx = await loadWarRoom(slug, { forWrite: false });
  if ("error" in ctx) notFound();
  const { db, member, event, team, teamRole, registration, writable } = ctx;
  const rows = await listChallenges(db, event.id, team.id);
  const isLead = teamRole === "captain" || teamRole === "co_captain";
  const cards: CardData[] = rows
    .filter((r) => !cat || r.c.category === cat)
    .map(({ c, claimer }) => ({
      id: c.id, name: c.name, category: c.category, points: c.points, status: c.status, claimer,
      claimedByMe: c.claimedBy === member.id, createdByMe: c.createdBy === member.id,
      notes: c.notesMd ?? "", links: c.links, solvedAtIso: c.solvedAt?.toISOString() ?? null,
    }));
  const solved = rows.filter((r) => r.c.status === "solved");
  const points = solved.reduce((sum, r) => sum + (r.c.points ?? 0), 0);
  const categories = [...new Set(rows.map((r) => r.c.category).filter(Boolean))] as string[];
  const phase = eventPhase(event, Date.now());

  return (
    <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
      <AutoRefresh enabled={writable} />
      <div className="flex flex-wrap items-center gap-3">
        <PhaseBadge phase={phase} />
        {phase === "live" && <span className="text-sm text-fg-muted"><Countdown targetIso={event.endsAt.toISOString()} prefix="ends in" /></span>}
        <span className="font-mono text-sm text-fg-muted">team {team.tag} · {registration.roster.length || "?"} playing</span>
        <span className="ml-auto font-mono text-sm text-green-bright">{solved.length} solved · {points} pts</span>
      </div>
      <CursorHeading level={1} prompt="#">{event.title}</CursorHeading>
      <p className="mt-1 text-sm"><Link href={`/events/${event.slug}`} className="text-fg-muted hover:text-green-bright">event page</Link></p>
      {!writable && (
        <p role="status" className="mt-4 rounded border border-line-strong p-3 text-sm text-fg-muted">
          This war room is read-only: it closed {Math.round(WAR_ROOM_GRACE_MS / 3_600_000)} hours after the event ended.
        </p>
      )}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          {writable && <GlassPanel className="p-4"><AddChallenge slug={event.slug} /></GlassPanel>}
          <nav aria-label="Category filter" className="flex flex-wrap gap-3 font-mono text-xs">
            <Link href={`/events/${event.slug}/war-room`} className={!cat ? "text-green-bright" : "text-fg-muted hover:text-fg"}>all</Link>
            {categories.map((c) => (
              <Link key={c} href={`/events/${event.slug}/war-room?cat=${encodeURIComponent(c)}`} className={cat === c ? "text-green-bright" : "text-fg-muted hover:text-fg"}>{c}</Link>
            ))}
          </nav>
          <Board slug={event.slug} cards={cards} isLead={isLead} writable={writable} />
        </div>
        <GlassPanel className="h-fit p-4">
          <NotesPanel slug={event.slug} notes={registration.notesMd ?? ""} updatedAt={registration.notesUpdatedAt?.getTime() ?? 0} writable={writable} />
        </GlassPanel>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Verify + commit**

`npm run typecheck && npm run lint && npm test` → pass.
```bash
git add "src/app/events/[slug]/war-room"
git commit -m "feat(war-room): board, challenge cards, team notes, auto-refresh"
```

---

### Task 11: Admin page

**Files:**
- Create: `src/app/admin/page.tsx`, `src/app/admin/actions.ts`, `src/app/admin/AdminRow.tsx`
- Modify: `src/lib/events/queries.ts` (+ `listRecentAudit`), `src/lib/validation/handle.ts` only if `admin` isn't already reserved (it is listed in RESERVED_HANDLES? check; add `"admin"` if missing)

**Interfaces:**
- Produces: `setPlatformRole(userId, _prev, form)`, `setBanned(userId, banned: boolean)` → `ActionState`; route `/admin` (moderators: audit view; admins: + member management).

- [ ] **Step 1: Audit query** — append to `src/lib/events/queries.ts`:

```ts
import { auditLog } from "@/lib/db/schema"; // merge into the existing schema import
import { like } from "drizzle-orm";          // merge into the existing drizzle import

/** Site-wide events and admin actions for moderators. */
export async function listRecentAudit(db: Db) {
  return db
    .select({ id: auditLog.id, action: auditLog.action, meta: auditLog.meta, createdAt: auditLog.createdAt, actor: users.handle })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.actorId))
    .where(or(like(auditLog.action, "event.%"), like(auditLog.action, "admin.%")))
    .orderBy(desc(auditLog.createdAt))
    .limit(100);
}
```
(`or` must be in the drizzle import.)

- [ ] **Step 2: Actions** — `src/app/admin/actions.ts`

```ts
"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireMember } from "@/lib/auth/member";
import { canAdmin } from "@/lib/auth/platform";
import { getDb } from "@/lib/db/client";
import { PLATFORM_ROLES } from "@/lib/db/enums";
import { auditLog, users } from "@/lib/db/schema";
import { auditEntry } from "@/lib/teams/audit";
import type { ActionState } from "@/app/teams/actions";

const idSchema = z.string().regex(/^[0-9A-Z]{26}$/);

async function authorize(userIdRaw: string, action: "role.assign" | "member.ban") {
  const actor = await requireMember();
  const id = idSchema.safeParse(userIdRaw);
  if (!id.success) return { error: "Member not found." } as const;
  const db = getDb();
  const target = await db.query.users.findFirst({ where: eq(users.id, id.data) });
  if (!target) return { error: "Member not found." } as const;
  if (!canAdmin({ id: actor.id, role: actor.platformRole }, action, { id: target.id, role: target.platformRole }))
    return { error: "You don't have permission to do that." } as const;
  return { db, actor, target } as const;
}

export async function setPlatformRole(userId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await authorize(userId, "role.assign");
  if ("error" in ctx) return { error: ctx.error };
  const role = z.enum(PLATFORM_ROLES).safeParse(form.get("role"));
  if (!role.success) return { error: "Pick a role." };
  const { db, actor, target } = ctx;
  await db.batch([
    db.update(users).set({ platformRole: role.data }).where(eq(users.id, target.id)),
    db.insert(auditLog).values(auditEntry({ teamId: null, actorId: actor.id, action: "admin.set_role", targetId: target.id, meta: { target: target.handle, role: role.data } })),
  ]);
  revalidatePath("/admin");
  return { ok: `@${target.handle ?? "member"} is now ${role.data}.` };
}

export async function setBanned(userId: string, banned: boolean): Promise<ActionState> {
  const ctx = await authorize(userId, "member.ban");
  if ("error" in ctx) return { error: ctx.error };
  const { db, actor, target } = ctx;
  await db.batch([
    db.update(users).set({ bannedAt: banned ? new Date() : null }).where(eq(users.id, target.id)),
    db.insert(auditLog).values(auditEntry({ teamId: null, actorId: actor.id, action: banned ? "admin.ban" : "admin.unban", targetId: target.id, meta: { target: target.handle } })),
  ]);
  revalidatePath("/admin");
  return { ok: banned ? `@${target.handle} is suspended.` : `@${target.handle} can use the site again.` };
}
```

- [ ] **Step 3: Row UI** — `src/app/admin/AdminRow.tsx`

```tsx
"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/teams/actions";
import { FormMessage, SubmitButton } from "@/components/teams/FormBits";
import type { PlatformRole } from "@/lib/auth/platform";
import { setBanned, setPlatformRole } from "./actions";

export function AdminRow({ id, handle, role, banned, isSelf }: { id: string; handle: string | null; role: PlatformRole; banned: boolean; isSelf: boolean }) {
  const [roleState, roleAction] = useActionState<ActionState, FormData>(setPlatformRole.bind(null, id), {});
  const [banState, banAction] = useActionState<ActionState, FormData>(() => setBanned(id, !banned), {});
  return (
    <li className="flex flex-wrap items-center gap-3 border-b border-line py-2">
      <span className="font-mono text-sm text-fg">@{handle ?? "(no handle)"}</span>
      {banned && <span className="font-mono text-xs text-red-bright">suspended</span>}
      {isSelf ? (
        <span className="ml-auto font-mono text-xs text-fg-muted">{role} (you)</span>
      ) : (
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <form key={role} action={roleAction} className="flex items-center gap-2">
            <label htmlFor={`pr-${id}`} className="sr-only">Role for @{handle}</label>
            <select id={`pr-${id}`} name="role" defaultValue={role} className="rounded border border-line-strong bg-bg-deep px-2 py-1 font-mono text-xs text-fg">
              <option value="member">member</option>
              <option value="moderator">moderator</option>
              <option value="admin">admin</option>
            </select>
            <SubmitButton variant="ghost" className="!px-2 !py-1 !text-xs" pending="…">set</SubmitButton>
          </form>
          {role !== "admin" && (
            <form action={banAction}>
              <SubmitButton variant={banned ? "ghost" : "danger"} className="!px-2 !py-1 !text-xs" pending="…">{banned ? "lift suspension" : "suspend"}</SubmitButton>
            </form>
          )}
        </div>
      )}
      <div className="w-full"><FormMessage state={roleState} /><FormMessage state={banState} /></div>
    </li>
  );
}
```

- [ ] **Step 4: Page** — `src/app/admin/page.tsx`

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { asc, like } from "drizzle-orm";
import { CursorHeading } from "@/components/fx/CursorHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { inputCls } from "@/components/teams/FormBits";
import { requireMember } from "@/lib/auth/member";
import { isStaff } from "@/lib/auth/platform";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { listRecentAudit } from "@/lib/events/queries";
import { describeAudit } from "@/lib/teams/audit";
import { AdminRow } from "./AdminRow";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await connection();
  const me = await requireMember();
  if (!isStaff(me.platformRole)) notFound();
  const { q = "" } = await searchParams;
  const db = getDb();
  const term = q.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30);
  const [people, audit] = await Promise.all([
    me.platformRole === "admin"
      ? db.query.users.findMany({ where: term ? like(users.handle, `%${term}%`) : undefined, orderBy: asc(users.handle), limit: 50 })
      : Promise.resolve([]),
    listRecentAudit(db),
  ]);
  return (
    <section className="mx-auto max-w-4xl px-4 pt-16 sm:px-6">
      <CursorHeading level={1} prompt="#">admin</CursorHeading>
      {me.platformRole === "admin" && (
        <GlassPanel className="mt-8 p-6">
          <h2 className="font-mono text-green">members</h2>
          <form className="mt-3" role="search">
            <label htmlFor="q" className="sr-only">Search by handle</label>
            <input id="q" name="q" defaultValue={term} placeholder="search handles" className={inputCls} />
          </form>
          <ul className="mt-4">
            {people.map((u) => (
              <AdminRow key={u.id} id={u.id} handle={u.handle} role={u.platformRole} banned={!!u.bannedAt} isSelf={u.id === me.id} />
            ))}
          </ul>
        </GlassPanel>
      )}
      <GlassPanel className="mt-8 p-6">
        <h2 className="font-mono text-green">recent moderation and event activity</h2>
        <ul className="mt-3 space-y-1 text-sm text-fg-muted">
          {audit.map((a) => (
            <li key={a.id}>
              <time dateTime={a.createdAt.toISOString()} className="font-mono text-xs">{a.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC</time>{" "}
              {describeAudit(a.action, a.actor, a.meta)}
            </li>
          ))}
          {audit.length === 0 && <li>Nothing yet.</li>}
        </ul>
      </GlassPanel>
    </section>
  );
}
```
Also protect the route in `src/proxy.ts`: add `"/admin(.*)"` to the protected-route matcher list alongside `/onboarding(.*)` and `/settings(.*)`.

- [ ] **Step 5: Verify + commit**

`npm run typecheck && npm run lint && npm test`. Locally make yourself admin: `npx wrangler d1 execute DB --local --command "update users set platform_role='admin' where handle='darktemplar'"` (local only). Visit `/admin`: list shows; changing a seeded member to moderator works; suspending a seeded member, then impersonating them, lands on `/suspended`. Non-staff → 404.
```bash
git add src/app/admin src/lib/events/queries.ts src/proxy.ts
git commit -m "feat(admin): platform roles and suspensions with audit trail"
```

---

### Task 12: Seed, full browser pass, size check, docs, PR

**Files:**
- Modify: `scripts/seed-dev.mjs`, `docs/PROGRESS.md`

- [ ] **Step 1: Seed a live event** — in `scripts/seed-dev.mjs`, after the team seeding block (before the final `console.log`s), add an optional `--event` flag:

```js
if (process.argv.includes("--event")) {
  const start = now - 3_600_000;
  const end = now + 47 * 3_600_000;
  d1(`insert or ignore into events(id, slug, title, kind, format, starts_at, ends_at, owner_team_id, created_at)
      values ('seed-ev', 'seed-live-ctf', 'Seed Live CTF', 'ctf', 'jeopardy', ${start}, ${end}, '${team.id}', ${now});
      insert or ignore into event_registrations(event_id, team_id, roster_json, created_at)
      values ('seed-ev', '${team.id}', '["seed-acid","seed-cereal"]', ${now});`);
  const chals = [["seed-ch-1", "baby-sqli", "web", 100, "open", "null"], ["seed-ch-2", "ret2win", "pwn", 250, "claimed", "'seed-acid'"], ["seed-ch-3", "xor-me", "crypto", 150, "solving", "'seed-cereal'"], ["seed-ch-4", "strings", "rev", 50, "solved", "'seed-cereal'"]];
  for (const [id, name, cat, pts, status, by] of chals) {
    d1(`insert or ignore into challenges(id, event_id, team_id, name, category, points, status, claimed_by, links_json, updated_at)
        values ('${id}', 'seed-ev', '${team.id}', '${name}', '${cat}', ${pts}, '${status}', ${by}, '[]', ${now});`);
  }
  console.log("seeded a live CTF 'seed-live-ctf' with 4 challenges for", tag);
}
```
Extend `--clean` to also run: `delete from challenges where id like 'seed-%'; delete from event_registrations where event_id like 'seed-%'; delete from events where id like 'seed-%';` (before deleting users). Update the usage comment at the top: `node scripts/seed-dev.mjs <TEAM_TAG> [--event]`.

- [ ] **Step 2: Browser pass** (dev server on 3210, signed in as captain of the seeded team)

  1. `/events` → live tab shows "Seed Live CTF" with an "ends in" countdown.
  2. War room: 4 cards in 4 columns; claim `baby-sqli` → moves to claimed with your handle; start → solving; solved → solved column, header totals update.
  3. Simulate a teammate (seeded users can't sign in): `npx wrangler d1 execute DB --local --command "update challenges set status='claimed', claimed_by='seed-acid' where id='seed-ch-1'"` → the open tab shows the change within ~10 s without reloading, and does not refresh while focus is in a textarea.
  4. Team notes: open edit in two tabs, save in tab A, then save in tab B → B shows "A teammate edited these notes…" (Review Focus 3).
  5. Notes containing `<script>alert(1)</script>`, `[x](javascript:alert(1))` and `[ok](https://example.com)` → no script runs, the javascript link has no href, the example link opens in a new tab (Review Focus 4).
  6. As a non-member (impersonate a user without a team, or sign out), `/events/seed-live-ctf/war-room` → 404.
  7. Make the event ended > 24 h ago via SQL (`update events set ends_at = <now - 25h>, starts_at = <now - 30h> where id='seed-ev'`) → read-only banner, no buttons, no auto-refresh.
  8. Hide the event as admin → gone from the board for a plain member, visible with "hidden" for admin.
  9. Screenshots at 1440 and 400 px; no console errors or CSP violations; low-FX unaffected.

- [ ] **Step 3: Worker size** — `npx opennextjs-cloudflare build && npx wrangler deploy --dry-run --outdir "$TEMP/se-dry"` → note `gzip:`; must be ≤ 3072 KiB. If over: stop and report to the owner with the number (options: trim, or Workers Paid).

- [ ] **Step 4: PROGRESS.md** — add a "Phase 4 — events & war room" section (what shipped, decisions: captains add events, auto-refresh, whole-team war room, CTF + community kinds, platform roles; gotchas: hand-written additive migration because drizzle-kit rebuilds tables, DOMPurify browser-only; owner actions pending: apply 0002 remote, first admin, branch protection). Update "Next" to Phase 5.

- [ ] **Step 5: Final checks + commit + push branch**

```bash
npm run typecheck && npm run lint && npm test
git add scripts/seed-dev.mjs docs/PROGRESS.md
git commit -m "chore: seed live event, Phase 4 progress notes"
git push -u origin phase-4-events
```
Pushing a non-`main` branch makes Cloudflare build a preview version only (production untouched). `gh` isn't installed: give the owner the link `https://github.com/Cyb0rgbytes/securityexile/compare/main...phase-4-events?expand=1` to open the PR.

---

### Task 13: Go-live (owner approval required — do not run without an explicit yes in chat)

- [ ] **Step 1: Ask the owner** to approve, in one message: (a) applying migration 0002 to the live D1, (b) making their account the first admin, (c) merging the PR (which deploys). Show the exact commands below.

- [ ] **Step 2: Remote migration (after yes)**

```bash
npx wrangler d1 execute DB --remote --command "select (select count(*) from users) u, (select count(*) from team_members) m, (select count(*) from teams) t"
npx wrangler d1 migrations apply DB --remote
npx wrangler d1 execute DB --remote --command "select (select count(*) from users) u, (select count(*) from team_members) m, (select count(*) from teams) t"
```
Counts must match before/after. Apply the migration **before** merging, so the new code never runs against the old schema.

- [ ] **Step 3: First admin (after yes)** — the owner tells you their live handle:

```bash
npx wrangler d1 execute DB --remote --command "update users set platform_role='admin' where handle='<HANDLE>'"
npx wrangler d1 execute DB --remote --command "select handle, platform_role from users where platform_role != 'member'"
```

- [ ] **Step 4: Owner merges the PR**, then verify production: `/events`, `/admin` load (200), `wrangler tail` shows no errors for a page load, and Workers Logs appear in the dashboard.

- [ ] **Step 5: Owner sets branch protection** on `main`: GitHub → Settings → Branches → Add rule for `main`: require a pull request, require status check `CI / check`.

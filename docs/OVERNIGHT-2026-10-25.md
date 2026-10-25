# Overnight session — 2026-10-25

All six queued tasks are done, plus one I added. That makes **7 PRs, all open and none merged**. I
judge 5 of them solid. One (#16) is security-urgent and needs you to watch the deploy. One (#18)
has two product decisions in it. Every `check` run was green when I finished. Workers Builds is
red on every branch, as usual.

Nothing was deployed. I ran no remote D1 command and put no secrets anywhere. Nothing was ticked
in the Build Plan.

## Merge order

| Order | PR | Why |
| --- | --- | --- |
| 1 | **#16** runtime advisories | Critical Next.js and DOMPurify advisories; see below. |
| 2 | **#15** vitest | Both #15 and #16 touch `package-lock.json`, so rebase whichever goes second (`npm install` regenerates it). |
| 3 | #14, #17 | Independent. |
| 4 | #13, then #18 | Both edit `/leaderboard`'s intro, so there's a one-line conflict. After #13 lands, the season board should switch to #13's tie-aware `withPlaces()`. |
| — | #19 | Independent. |

None of these needs a remote migration before merge, because there is no schema change anywhere.

## PRs

### #13: team standings on `/leaderboard` (task 1) — solid
Adds a teams board ranked by summed member XP, using a new `topTeams()` query; `listTeams()` only
counted members. Also adds tie-aware places ("1, 2, 2, 4") on both boards. The page now calls
`connection()`.
- **Verified:**
  - Local D1 with seeded ties and zero-XP teams, which I removed afterwards.
  - curl on workerd.
  - Playwright at 1440 and 390. That pass found a jump-link target below 24px, which I fixed.
  - 3678 KiB gzipped.
- **Not verified:** nothing material.

### #14: Arabic header, palette and footer on `/ar` (task 2, fixes issue #7) — solid
The dictionary is looked up on the server and the resolved strings are passed as props. No
dictionary text ends up in client JS; I grepped all 30 chunks. The logo goes to `/ar`, and the
footer links to the Arabic policies.
- **Two extras, explained in the PR:**
  - **`LangSync`.** I confirmed in a browser that a client-side `<Link>` between `/ar` and `/`
    left `<html lang/dir>` stale. That already happens on main. With this PR it would also have
    left the header in the wrong language, so `LangSync` refreshes when the path changes
    language. It refreshes at most once per path, so the `ctf.`/`labs.` holding rewrite can't
    loop.
  - **`i18n/path.ts`.** The proxy no longer bundles both dictionaries.
- **Verified:** curl on `/ar`, `/ar/rules`, `/` and `/leaderboard`, and Playwright on AR at 1440
  and 390 (with the menu open) and EN at 1440. Cross-language client navigation works both
  ways, the palette shows Arabic, and the console has 0 errors.
- **Not verified:** the signed-in UserButton menu labels.

### #15: vitest 5.0.5, clearing the three vite Dependabot alerts (task 3) — solid
vite goes from 8.3.2 to 8.3.5. The alerts clear only once this reaches main, so I could confirm
only the local `npm ls` and `npm audit`. I checked the build and CSS on workerd because postcss
is hoisted. 325 tests pass, the same as main.

### #16: patch critical runtime advisories (not in the queue) — urgent, please watch the deploy
I found these while doing task 3. `npm audit` flags runtime packages that Dependabot hasn't
raised:
- **next 16.3.8:** two critical RCEs (Image Optimizer with SVG; `use cache` returning typed
  arrays), plus a Server Actions DoS that applies directly to us.
- **dompurify:** critical and high severity.
- **zod:** high.
- **body-parser:** high.

The PR moves next to 16.4.3, keeping the exact pin, and @opennextjs/cloudflare to 1.20.13, which
16.4 requires.

**Risks:**
- next 16.4.3 is two days old.
- The Worker shrank from 3672 to 3238 KiB gzipped. I traced that to the OpenNext handlers,
  probably satori/resvg being deduped. OG images still render, and every route passes curl with
  CSP.
- OpenNext 1.20.13 adds a build-time `glob` CLI advisory. It isn't exploitable here; the PR
  explains why.

Smoke-test production right after this deploys.

### #17: the deferred Phase 5 findings (task 4) — solid
I triaged all 10. **6 were real and are fixed:**
- Uploads now fail closed, and JPEGs are cut at their end-of-image marker.
- `//` links get rel and target.
- Saves over 1 MB get a friendly error instead of a 500.
- Moderator-hidden comments no longer count.
- Votes and hearts are refused on hidden writeups.
- The `spoiler_until` race is closed with a subquery.
- The rerender script works on long writeups on `--remote`.

**3 were already fixed:** repeated params (394511f), the hidden-event title, and half of the
comment-count bug. **1 I skipped:** letting members delete images is a feature.
- **Verified:**
  - 7,354 real images through the strippers, with 0 refused.
  - The rerender script on a writeup with 373 KB of HTML, which came back byte-identical.
  - D1 checks for the comment count and the subquery.
- **Not verified:** signed-in actions.
- **After merge:** two optional, idempotent remote commands are listed in the PR.

### #18: season standings (task 5, p3-02) — solid code, two decisions for you
There's no schema change; the `seasons` table already exists. Season XP is recounted at read time
from the same rows as all-time XP, filtered to the season's window, so docs/XP.md's rule holds.
`docs/SEASONS.md` has the exact `wrangler` insert to open Season 1 (1 Nov 2026 to 1 Feb 2027).
- **Verified:**
  - A season covering all time reproduces the all-time recount exactly.
  - Half-open windows checked at the boundaries.
  - Upcoming seasons, unknown ids and an injection-shaped id all return 404.
  - Playwright at 1440 and 390.

### #19: monthly growth metrics at `/stats` (task 6, p3-08) — solid
Staff only, using the existing `isStaff()` check; everyone else gets a 404. Read-only aggregates
with no new tables. No member is named; user ids are only counted on the server. The month
columns are sign-ups, active, retained, writeups and event registrations. The current month is
marked "so far", and moderator-hidden content doesn't count as activity; both came from review.
- **Verified:**
  - SQL on D1 matches hand-written raw counts.
  - Multi-month seed data renders the expected retention (50%, then 0%).
  - Signed out, curl gets a 404 with no data in the HTML.
- **To see the page without a staff session**, I built locally once with the guard swapped out.
  I reverted it and confirmed by grep. The final build has the guard.
- **Not verified:** signed-in member and staff sessions.

## Found but not fixed

1. **Markdown render CPU.** A writeup made of about 99,000 blank lines inside a ```` ```terminal ````
   block takes **about 14 s** to render on this machine and produces 4 MB of HTML. #17 stops the
   oversized save, but the CPU is spent before that check. Preview is rate-limited, yet one
   request could still burn a Worker's CPU budget. The fix would be a cap on lines per terminal
   block or per writeup, for example 10,000. That's a new input rule, so I left it to you.
2. **Font preloads.** Every page preloads five fonts, apparently including the Arabic and
   Shippori faces on English pages. Chrome warns that they go unused. Possibly a small LCP and
   bandwidth win; not investigated.
3. **Footer `/security` link** stays English on `/ar`, because there's no Arabic disclosure page.
4. **Clerk's own UserButton strings** ("Manage account", "Sign out") stay English on `/ar`.
   Fixing that means passing Clerk `localization` per language.
5. **Easter-egg palette replies** from `redeemSecret` are English only.
6. **Stale comment in `wrangler.jsonc`.** It still mentions the free plan's 3 MiB limit, but
   you're on Workers Paid with 10 MiB.
7. **Dev-tooling audit entries:** wrangler, miniflare and undici. npm's only suggested fix is
   downgrading OpenNext to 1.8.4, so they're not actionable.
8. **`xp_events`** (schema 0000) is an unused ledger that contradicts the recount rule. Consider
   dropping it some time, as a hand-written, reviewed migration.

## A mistake I made

While stopping my local preview server to free `.open-next`, my process filter matched every
`wrangler`/`workerd` process on the machine. It killed a **`wrangler dev --port 8788`, plus its
workerd children, running from `M:\AI_Projects\Chatapp\.claude\worktrees\agent-ab44399b18b1a9b91`**.
If something was running there, it needs restarting. After that, I only stopped processes whose
command line contained `Security Exile`.

## Environment notes

- Git Bash couldn't fork all night, so everything ran in PowerShell.
- `.dev.vars` has no `sk_test_`-prefixed Clerk key, but the keys belong to a **Clerk dev
  instance**, so `npm run preview` with Playwright worked fine. I saved this to memory so future
  sessions don't skip browser checks.
- Local D1 was re-rendered by the rerender script (body_html only). All seed rows I added were
  deleted, and the counts were checked afterwards.

## Questions for you

1. **#16:** are you OK shipping next 16.4.3 two days after its release, given two critical RCEs
   on 16.3.8? I'd say yes, followed by a production smoke test.
2. **#18:** should an event count in the season it **starts** in (what I built) or the one it ends
   in?
3. **#18:** do you want team season standings? They'd credit a member's past season work to their
   *current* team.
4. **Render CPU:** should writeups get a line cap (finding 1), and at what number?
5. **#17:** do you want to run the two optional remote commands after merge? One re-renders
   existing writeups so old `//` links get rel and target; the other recounts comment counts.

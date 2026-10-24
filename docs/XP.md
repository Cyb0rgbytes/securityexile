# XP and ranks

How members earn standing, and the one command you need when the rules change.

## What earns XP

| Source | Worth | Condition |
| --- | --- | --- |
| Published writeup | 50 | `published_at` set and `hidden_at` null — drafts and hidden writeups don't count |
| Event played | 25 | the member appears on a team's roster for that event, counted once per event |

**Upvotes and hearts earn nothing, deliberately.** Sign-up is open, so vote-driven XP could be
traded between accounts or farmed with alts, and there is no in-app admin tooling to undo it
(see the no-in-app-admin rule). Hearts were already defined as appreciation rather than ranking
when they shipped. XP therefore measures contribution, not popularity.

The weights live in `XP_FOR` in `src/lib/profile/xp.ts`. Change them there — the SQL recount and
the leaderboard copy both read from that constant.

## Ranks

`initiate` → `operator` (100) → `specialist` (300) → `elite` (700) → `legend` (1500).

Thresholds are `RANK_FLOOR` in the same file, and the SQL `CASE` is generated from it so the ladder
has one definition.

## How it stays correct

XP is **recomputed from the tables**, never incremented. `recountXp()`
(`src/lib/profile/queries.ts`) returns two statements that go into the same `db.batch([...])` as the
change that triggered them: the first rewrites `users.xp` from the writeups and rosters that exist
right now, the second derives `rank_tier` from the value just written. A double submit or a retry
therefore can't drift the total, and deleting a writeup takes its XP with it.

Recounts are wired into every action that changes an input:

- `setPublished`, `setWriteupHidden`, `deleteWriteup` (`src/app/writeups/actions.ts`) — always for
  the **author**, not the actor, since a moderator can hide someone else's writeup.
- `setRoster`, `unregisterTeam` (`src/app/events/actions.ts`) — for the members added or dropped,
  via `rosterDelta()`.

## Backfill

Members earn nothing until an action recounts them, so after changing the weights — or when first
deploying this — recount everyone once:

```sh
npx wrangler d1 execute DB --remote --command "update users set xp = (select count(*) from writeups w where w.author_id = users.id and w.published_at is not null and w.hidden_at is null) * 50 + (select count(distinct er.event_id) from event_registrations er, json_each(er.roster_json) j where j.value = users.id) * 25"
npx wrangler d1 execute DB --remote --command "update users set rank_tier = case when xp >= 1500 then 'legend' when xp >= 700 then 'elite' when xp >= 300 then 'specialist' when xp >= 100 then 'operator' else 'initiate' end"
```

Both are idempotent — they recompute from scratch, so running them twice changes nothing. Take a
Time Travel bookmark first (`npx wrangler d1 time-travel info DB`), as with any remote write. If
the weights in `XP_FOR` have changed, update the numbers in these commands to match.

## Known gap

Hiding an **event** does not remove the XP its players earned; only hidden writeups stop counting.
Rosters are evidence that someone turned up, and event hiding is a listing-moderation action. If
that turns out to be wrong, add `and e.hidden_at is null` to the event half of `xpExpression()` and
run the backfill.

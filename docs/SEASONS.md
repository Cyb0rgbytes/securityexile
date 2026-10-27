# Seasons

Seasonal standings sit beside the all-time board at `/leaderboard/seasons`.

## What a season counts

A season counts the same contributions as all-time XP (see [XP.md](XP.md)), restricted to its window `[starts_at, ends_at)`:

| Source | Worth | Counts in the season that… |
| --- | --- | --- |
| Published writeup | 50 | its `published_at` falls in. Hidden writeups don't count. |
| Event played | 25 | the event **starts** in. An event that runs over a boundary counts once, in the season it started in. |

Season XP is **recounted from those rows on every page load**, using `seasonStandings()` in
`src/lib/profile/queries.ts`. It is never stored or incremented. If a writeup is hidden or deleted,
or a roster changes, the season board reflects it on the next load. There's nothing to backfill
when the rules change.

The all-time XP and rank tiers are unaffected. A new season starts everyone level on the season
board only.

`xp_events` (schema 0000) is an append-only ledger that nothing writes to. It would contradict the
recount rule, so it stays unused.

## Opening a season

There is no in-app admin (see the no-in-app-admin rule). A season is a row inserted by a reviewed
command. Times are epoch milliseconds in UTC. The `id` becomes the URL, so use letters, digits and
dashes only, and at most 40 characters.

```sh
# First, as with any remote write: note a Time Travel bookmark to restore to if needed.
npx wrangler d1 time-travel info DB
# Season 1: 1 Nov 2026 00:00 UTC to 1 Feb 2027 00:00 UTC
npx wrangler d1 execute DB --remote --command "insert into seasons (id, name, starts_at, ends_at) values ('2026-s1', 'Season 1', 1793491200000, 1801440000000)"
```

To compute the timestamps, use `node -e "console.log(Date.UTC(2026, 10, 1))"`. Months are 0-based.

**Rules of thumb:**
- Make seasons back to back. The end of one is the start of the next. Windows are half-open, so
  they never both claim an instant.
- If two windows overlap by mistake, the page shows the one that started **later** as live.
- An upcoming season is unlisted and returns 404 until its start time.
- To fix a typo in a name: `update seasons set name = '…' where id = '…'`. Changing a window
  re-scores that season immediately, because nothing is stored.
- `ends_at` must be after `starts_at`. The `seasons_window_ck` constraint enforces this.

## Not built yet

- **Team season standings.** A team's season total would sum its *current* members' season XP,
  which credits a member's past contributions to whichever team they're on now. That needs a
  decision before it's built.
- **Season badges or rewards** at the close of a season.

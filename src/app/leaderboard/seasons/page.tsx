import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { CursorHeading } from "@/components/fx/CursorHeading";
import { SeasonBoard } from "@/components/ranks/SeasonBoard";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { getDb } from "@/lib/db/client";
import { requestNow } from "@/lib/events/clock";
import { listSeasons, seasonStandings } from "@/lib/profile/queries";
import { currentSeason, pastAndLive, seasonStatus } from "@/lib/profile/seasons";
import { XP_FOR } from "@/lib/profile/xp";

export const metadata: Metadata = { title: "Seasons" };

export default async function SeasonsPage() {
  // Reads live D1 data: render per request, never at build time.
  await connection();
  const db = getDb();
  const now = requestNow();
  const seasons = await listSeasons(db);
  const live = currentSeason(seasons, now);
  const members = live ? await seasonStandings(db, live) : [];
  const archive = pastAndLive(seasons, now).filter((s) => s.id !== live?.id);

  return (
    <article className="mx-auto max-w-3xl px-4 pt-16 sm:px-6">
      <CursorHeading level={1} prompt="#">
        seasons
      </CursorHeading>
      <p className="mt-4 text-fg-muted">
        A season counts the same things as the{" "}
        <Link href="/leaderboard" className="text-green hover:text-green-bright">
          all-time board
        </Link>{" "}
        — writeups ({XP_FOR.publishedWriteup} XP) published in the season and events ({XP_FOR.eventPlayed} XP) that start in it — so
        everyone starts level when a new one opens. All-time XP and ranks carry on underneath.
      </p>

      <div className="mt-10">
        {live ? (
          <SeasonBoard season={live} status="live" members={members} />
        ) : (
          <GlassPanel className="p-5 font-mono text-sm leading-7">
            <p className="text-fg-muted">No season is running right now. The all-time board keeps counting in the meantime.</p>
          </GlassPanel>
        )}
      </div>

      {archive.length > 0 && (
        <section aria-labelledby="past-seasons" className="mt-14">
          <h2 id="past-seasons" className="font-display text-xl font-semibold tracking-tight text-fg">
            Past seasons
          </h2>
          <ul className="mt-4 divide-y divide-line font-mono text-sm">
            {archive.map((s) => (
              <li key={s.id}>
                <Link href={`/leaderboard/seasons/${s.id}`} className="flex min-h-11 items-center justify-between gap-4 py-2 text-fg hover:text-green-bright">
                  <span>{s.name}</span>
                  <span className="text-fg-muted">{seasonStatus(s, now)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

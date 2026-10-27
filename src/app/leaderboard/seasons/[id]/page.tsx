import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { SeasonBoard } from "@/components/ranks/SeasonBoard";
import { getDb } from "@/lib/db/client";
import { seasons } from "@/lib/db/schema";
import { requestNow } from "@/lib/events/clock";
import { seasonStandings } from "@/lib/profile/queries";
import { seasonStatus } from "@/lib/profile/seasons";

type Props = { params: Promise<{ id: string }> };

/** Season ids are chosen by whoever runs the insert (e.g. "2026-s1"); anything else is a 404. */
const SEASON_ID = /^[A-Za-z0-9-]{1,40}$/;

async function load(id: string) {
  if (!SEASON_ID.test(id)) return null;
  const season = await getDb().query.seasons.findFirst({ where: eq(seasons.id, id) });
  // Upcoming seasons stay unlisted until they open.
  return season && seasonStatus(season, requestNow()) !== "upcoming" ? season : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const season = await load((await params).id);
  return { title: season ? `${season.name} · Seasons` : "Seasons" };
}

export default async function SeasonPage({ params }: Props) {
  await connection();
  const season = await load((await params).id);
  if (!season) notFound();
  const members = await seasonStandings(getDb(), season);

  return (
    <article className="mx-auto max-w-3xl px-4 pt-16 sm:px-6">
      <p className="font-mono text-sm">
        <Link href="/leaderboard/seasons" className="text-green hover:text-green-bright">
          <span aria-hidden="true" className="inline-block rtl:rotate-180">
            ←
          </span>{" "}
          seasons
        </Link>
      </p>
      <div className="mt-6">
        <SeasonBoard season={season} status={seasonStatus(season, requestNow())} members={members} level={1} />
      </div>
    </article>
  );
}

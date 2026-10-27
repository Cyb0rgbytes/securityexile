import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { CursorHeading } from "@/components/fx/CursorHeading";
import { EmblemBadge } from "@/components/teams/EmblemBadge";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { NeonButton } from "@/components/ui/NeonButton";
import { getDb } from "@/lib/db/client";
import { topMembers } from "@/lib/profile/queries";
import { withPlaces } from "@/lib/profile/standings";
import { XP_FOR } from "@/lib/profile/xp";
import { topTeams } from "@/lib/teams/queries";

export const metadata: Metadata = { title: "Ranks" };

const th = "py-2 pe-4 text-start font-normal";

export default async function LeaderboardPage() {
  // Reads live D1 data: render per request, never at build time.
  await connection();
  const db = getDb();
  const [members, teams] = await Promise.all([topMembers(db), topTeams(db)]);

  return (
    <article className="mx-auto max-w-3xl px-4 pt-16 sm:px-6">
      <CursorHeading level={1} prompt="#">
        ranks
      </CursorHeading>
      <p className="mt-4 text-fg-muted">
        XP comes from publishing writeups ({XP_FOR.publishedWriteup} each) and playing events ({XP_FOR.eventPlayed} each). Upvotes don&apos;t
        move it, so the board can&apos;t be traded up. A team&apos;s total is its members&apos; XP added together.
      </p>
      <nav aria-label="Boards" className="mt-4 flex gap-4 font-mono text-sm">
        <a href="#members" className="inline-flex min-h-6 items-center text-green hover:text-green-bright">
          members
        </a>
        <a href="#teams" className="inline-flex min-h-6 items-center text-green hover:text-green-bright">
          teams
        </a>
      </nav>

      <section aria-labelledby="members" className="mt-10">
        <CursorHeading level={2} prompt="##">
          <span id="members" className="scroll-mt-24">
            members
          </span>
        </CursorHeading>
        {members.length === 0 ? (
          <GlassPanel className="mt-6 p-5 font-mono text-sm leading-7">
            <p className="text-fg-muted">Nobody&apos;s on the board yet. Publish a writeup and you&apos;ll be first.</p>
            <div className="mt-4">
              <NeonButton href="/writeups/new">write one</NeonButton>
            </div>
          </GlassPanel>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[22rem] text-start text-sm">
              <caption className="sr-only">Members ranked by XP</caption>
              <thead className="font-mono text-xs uppercase tracking-[0.2em] text-fg-muted">
                <tr className="border-b border-line">
                  <th scope="col" className={th}>
                    #
                  </th>
                  <th scope="col" className={th}>
                    member
                  </th>
                  <th scope="col" className={th}>
                    rank
                  </th>
                  <th scope="col" className="py-2 text-end font-normal">
                    xp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {withPlaces(members).map((m) => (
                  <tr key={m.handle}>
                    <td className="py-2 pe-4 font-mono text-fg-muted">{m.place}</td>
                    <td className="py-2 pe-4">
                      <Link href={`/u/${m.handle}`} className="text-fg hover:text-green-bright">
                        <span dir="ltr">@{m.handle}</span>
                        {m.displayName && <span className="ms-2 text-fg-muted">{m.displayName}</span>}
                      </Link>
                    </td>
                    <td className="py-2 pe-4 font-mono text-green-bright">{m.rankTier}</td>
                    <td className="py-2 text-end font-mono tabular-nums text-fg">{m.xp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="teams" className="mt-14">
        <CursorHeading level={2} prompt="##">
          <span id="teams" className="scroll-mt-24">
            teams
          </span>
        </CursorHeading>
        {teams.length === 0 ? (
          <GlassPanel className="mt-6 p-5 font-mono text-sm leading-7">
            <p className="text-fg-muted">No team has scored yet. A team ranks once one of its members earns XP.</p>
            <div className="mt-4">
              <NeonButton href="/teams">find a team</NeonButton>
            </div>
          </GlassPanel>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[22rem] text-start text-sm">
              <caption className="sr-only">Teams ranked by their members&apos; combined XP</caption>
              <thead className="font-mono text-xs uppercase tracking-[0.2em] text-fg-muted">
                <tr className="border-b border-line">
                  <th scope="col" className={th}>
                    #
                  </th>
                  <th scope="col" className={th}>
                    team
                  </th>
                  <th scope="col" className={th}>
                    members
                  </th>
                  <th scope="col" className="py-2 text-end font-normal">
                    xp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {withPlaces(teams).map((t) => (
                  <tr key={t.tag}>
                    <td className="py-2 pe-4 font-mono text-fg-muted">{t.place}</td>
                    <td className="py-2 pe-4">
                      <Link href={`/teams/${t.tag}`} className="flex items-center gap-3 text-fg hover:text-green-bright">
                        <EmblemBadge emblem={t.logoKey} size={28} />
                        <span className="min-w-0">
                          <span className="font-mono text-green" dir="ltr">
                            [{t.tag}]
                          </span>
                          <span className="ms-2">{t.name}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="py-2 pe-4 font-mono tabular-nums text-fg-muted">{t.members}</td>
                    <td className="py-2 text-end font-mono tabular-nums text-fg">{t.xp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </article>
  );
}

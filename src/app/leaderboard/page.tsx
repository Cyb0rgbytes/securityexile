import type { Metadata } from "next";
import Link from "next/link";
import { CursorHeading } from "@/components/fx/CursorHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { NeonButton } from "@/components/ui/NeonButton";
import { getDb } from "@/lib/db/client";
import { topMembers } from "@/lib/profile/queries";
import { XP_FOR } from "@/lib/profile/xp";

export const metadata: Metadata = { title: "Ranks" };

export default async function LeaderboardPage() {
  const members = await topMembers(getDb());

  return (
    <article className="mx-auto max-w-3xl px-4 pt-16 sm:px-6">
      <CursorHeading level={1} prompt="#">
        ranks
      </CursorHeading>
      <p className="mt-4 text-fg-muted">
        XP comes from publishing writeups ({XP_FOR.publishedWriteup} each) and playing events ({XP_FOR.eventPlayed} each). Upvotes don&apos;t
        move it, so the board can&apos;t be traded up.{" "}
        <Link href="/leaderboard/seasons" className="text-green hover:text-green-bright">
          Season standings
        </Link>{" "}
        count the same things inside a season&apos;s dates.
      </p>

      {members.length === 0 ? (
        <GlassPanel className="mt-8 p-5 font-mono text-sm leading-7">
          <p className="text-fg-muted">Nobody&apos;s on the board yet. Publish a writeup and you&apos;ll be first.</p>
          <div className="mt-4">
            <NeonButton href="/writeups/new">write one</NeonButton>
          </div>
        </GlassPanel>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[22rem] text-start text-sm">
            <caption className="sr-only">Members ranked by XP</caption>
            <thead className="font-mono text-xs uppercase tracking-[0.2em] text-fg-muted">
              <tr className="border-b border-line">
                <th scope="col" className="py-2 pe-4 text-start font-normal">
                  #
                </th>
                <th scope="col" className="py-2 pe-4 text-start font-normal">
                  member
                </th>
                <th scope="col" className="py-2 pe-4 text-start font-normal">
                  rank
                </th>
                <th scope="col" className="py-2 text-end font-normal">
                  xp
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {members.map((m, i) => (
                <tr key={m.handle}>
                  <td className="py-2 pe-4 font-mono text-fg-muted">{i + 1}</td>
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
    </article>
  );
}

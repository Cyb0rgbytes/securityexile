import Link from "next/link";
import { LocalTime } from "@/components/events/LocalTime";
import { GlassPanel } from "@/components/ui/GlassPanel";
import type { SeasonMember } from "@/lib/profile/queries";
import type { Season, SeasonStatus } from "@/lib/profile/seasons";

const th = "py-2 pe-4 text-start font-normal";

/**
 * A season's window and its member board. Server component: the rows are already recounted.
 * `level` is 1 on a season's own page, which has no other heading.
 */
export function SeasonBoard({ season, status, members, level = 2 }: { season: Season; status: SeasonStatus; members: SeasonMember[]; level?: 1 | 2 }) {
  const Heading = `h${level}` as const;
  return (
    <section aria-labelledby={`season-${season.id}`}>
      <Heading id={`season-${season.id}`} className="font-display text-2xl font-semibold tracking-tight text-fg">
        {season.name}
        {status === "live" && " "}
        {status === "live" && <span className="ms-2 align-middle font-mono text-xs uppercase tracking-[0.2em] text-green-bright">live</span>}
      </Heading>
      <p className="mt-2 font-mono text-sm text-fg-muted">
        <LocalTime iso={season.startsAt.toISOString()} mode="date" /> <span aria-hidden="true" className="inline-block rtl:rotate-180">→</span>
        <span className="sr-only">to</span> <LocalTime iso={season.endsAt.toISOString()} mode="date" />
      </p>

      {members.length === 0 ? (
        <GlassPanel className="mt-6 p-5 font-mono text-sm leading-7">
          <p className="text-fg-muted">
            {status === "live" ? "Nobody has scored this season yet. A writeup published now counts here." : "Nobody scored in this season."}
          </p>
        </GlassPanel>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[22rem] text-start text-sm">
            <caption className="sr-only">Members ranked by XP earned in {season.name}</caption>
            <thead className="font-mono text-xs uppercase tracking-[0.2em] text-fg-muted">
              <tr className="border-b border-line">
                <th scope="col" className={th}>
                  #
                </th>
                <th scope="col" className={th}>
                  member
                </th>
                <th scope="col" className={`${th} hidden sm:table-cell`}>
                  writeups
                </th>
                <th scope="col" className={`${th} hidden sm:table-cell`}>
                  events
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
                  <td className="hidden py-2 pe-4 font-mono tabular-nums text-fg-muted sm:table-cell">{m.writeups}</td>
                  <td className="hidden py-2 pe-4 font-mono tabular-nums text-fg-muted sm:table-cell">{m.events}</td>
                  <td className="py-2 text-end font-mono tabular-nums text-fg">{m.xp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

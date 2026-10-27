import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CursorHeading } from "@/components/fx/CursorHeading";
import { getMember } from "@/lib/auth/member";
import { isStaff } from "@/lib/auth/platform";
import { getDb } from "@/lib/db/client";
import { requestNow } from "@/lib/events/clock";
import { growthTable, lastMonths, monthStart } from "@/lib/stats/growth";
import { activity, growthCounts } from "@/lib/stats/queries";

export const metadata: Metadata = { title: "Stats", robots: { index: false, follow: false } };

/** Months shown. One more is fetched so the oldest shown month has a retention figure. */
const MONTHS = 12;

const th = "py-2 pe-4 text-end font-normal";
const td = "py-2 pe-4 text-end font-mono tabular-nums";
const pct = (r: number | null) => (r === null ? "—" : `${Math.round(r * 100)}%`);
const monthLabel = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

/**
 * Monthly growth for staff (moderators and admins). Read-only counts: no member is named, and
 * there's nothing to act on here. Everyone else gets a 404, so the page doesn't advertise itself.
 */
export default async function StatsPage() {
  await connection();
  const member = await getMember();
  if (!member || !isStaff(member.platformRole)) notFound();

  const db = getDb();
  const months = lastMonths(requestNow(), MONTHS + 1);
  const from = new Date(monthStart(months[0]));
  const [counts, act] = await Promise.all([growthCounts(db, from), activity(db, from)]);
  const rows = growthTable(months, counts, act).slice(1).reverse();
  // The newest row is the month in progress: its figures, retention especially, are partial.
  const current = months.at(-1);

  return (
    <article className="mx-auto max-w-4xl px-4 pt-16 sm:px-6">
      <CursorHeading level={1} prompt="#">
        stats
      </CursorHeading>
      <p className="mt-4 max-w-2xl text-fg-muted">
        Monthly growth, newest first, by calendar month in UTC. Totals only: no member is named or listed here, and nothing on this page
        changes anything.
      </p>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <caption className="sr-only">Sign-ups, active members, retention, writeups published and event registrations per month</caption>
          <thead className="font-mono text-xs uppercase tracking-[0.2em] text-fg-muted">
            <tr className="border-b border-line">
              <th scope="col" className="py-2 pe-4 text-start font-normal">
                month
              </th>
              <th scope="col" className={th}>
                sign-ups
              </th>
              <th scope="col" className={th}>
                active
              </th>
              <th scope="col" className={th}>
                retained
              </th>
              <th scope="col" className={th}>
                writeups
              </th>
              <th scope="col" className="py-2 text-end font-normal">
                event regs
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.month}>
                <th scope="row" className="py-2 pe-4 text-start font-mono font-normal text-fg">
                  {monthLabel(r.month)}
                  {r.month === current && <span className="ms-2 text-xs text-fg-muted">so far</span>}
                </th>
                <td className={`${td} text-fg`}>{r.signups}</td>
                <td className={`${td} text-fg`}>{r.active}</td>
                <td className={`${td} text-fg-muted`}>{pct(r.retention)}</td>
                <td className={`${td} text-fg`}>{r.published}</td>
                <td className="py-2 text-end font-mono tabular-nums text-fg">{r.registrations}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="mt-10 grid gap-x-6 gap-y-3 text-sm text-fg-muted sm:grid-cols-[max-content_1fr]">
        <dt className="font-mono text-fg">sign-ups</dt>
        <dd>Accounts created, onboarded or not.</dd>
        <dt className="font-mono text-fg">active</dt>
        <dd>
          Members who published a writeup, commented, hearted a writeup, registered a team for an event or joined a team that month.
          Writeups and comments later hidden by a moderator don&apos;t count. Votes carry no date and bookmarks are private, so neither counts.
        </dd>
        <dt className="font-mono text-fg">retained</dt>
        <dd>Of last month&apos;s active members, the share active again this month. The current month is still filling in, so it reads low early on.</dd>
        <dt className="font-mono text-fg">writeups</dt>
        <dd>Writeups first published that month and not hidden since.</dd>
        <dt className="font-mono text-fg">event regs</dt>
        <dd>Team registrations for events, counted when made.</dd>
      </dl>
    </article>
  );
}

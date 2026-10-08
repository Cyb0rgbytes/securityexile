import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getDb } from "@/lib/db/client";
import { getMember } from "@/lib/auth/member";
import { findMembershipOf, listTeams } from "@/lib/teams/queries";
import { EmblemBadge } from "@/components/teams/EmblemBadge";
import { JOIN_MODE_LABEL } from "@/components/teams/RoleChip";
import { NeonButton } from "@/components/ui/NeonButton";

export const metadata: Metadata = { title: "Teams" };

export default async function TeamsPage() {
  // Reads live D1 data: render per request, never at build time.
  await connection();
  const db = getDb();
  const [teamsList, member] = await Promise.all([listTeams(db), getMember()]);
  const mine = member ? await findMembershipOf(db, member.id) : undefined;

  return (
    <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-green">
            <span aria-hidden="true">$ </span>ls teams/
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg">Teams</h1>
          <p className="mt-2 max-w-xl text-fg-muted">Study groups and competition crews. Each member belongs to one team.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {mine ? (
            <NeonButton href={`/teams/${mine.team.tag}`} variant="ghost">
              your team: {mine.team.tag}
            </NeonButton>
          ) : (
            <>
              <NeonButton href="/join" variant="ghost">
                have a code?
              </NeonButton>
              <NeonButton href="/teams/new">create a team</NeonButton>
            </>
          )}
        </div>
      </div>

      {teamsList.length === 0 ? (
        <div className="glass bracketed mt-10 p-8 text-center">
          <p className="font-mono text-fg">No teams yet.</p>
          <p className="mt-2 text-sm text-fg-muted">Start the first one and invite people with a code.</p>
          <div className="mt-6">
            <NeonButton href="/teams/new">create a team</NeonButton>
          </div>
        </div>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teamsList.map((t) => (
            <li key={t.tag}>
              <Link
                href={`/teams/${t.tag}`}
                className="glass bracketed flex h-full gap-4 p-5 transition-colors hover:border-line-strong"
              >
                <EmblemBadge emblem={t.logoKey} size={56} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-fg">{t.name}</p>
                  <p className="font-mono text-xs text-green">[{t.tag}]</p>
                  <p className="mt-2 font-mono text-xs text-fg-muted">
                    {t.members} {t.members === 1 ? "member" : "members"} · {JOIN_MODE_LABEL[t.joinMode]}
                  </p>
                  {t.focus.length > 0 && (
                    <p className="mt-2 flex flex-wrap gap-1">
                      {t.focus.slice(0, 5).map((f) => (
                        <span key={f} className="rounded border border-line px-1.5 py-0.5 font-mono text-[0.65rem] text-fg-muted">
                          {f}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

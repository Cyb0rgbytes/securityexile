import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMember } from "@/lib/auth/member";
import { getDb } from "@/lib/db/client";
import { can } from "@/lib/teams/permissions";
import { activePublicCode, findMembershipOf, findTeamByTag, listRoster, pendingRequestOf } from "@/lib/teams/queries";
import { tagParamSchema } from "@/lib/teams/validation";
import { EmblemBadge } from "@/components/teams/EmblemBadge";
import { JOIN_MODE_LABEL, RoleChip } from "@/components/teams/RoleChip";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { NeonButton } from "@/components/ui/NeonButton";
import { LeaveTeam, RequestToJoin } from "./TeamActions";

type Props = { params: Promise<{ tag: string }> };

async function load(tagRaw: string) {
  const tag = tagParamSchema.safeParse(tagRaw);
  return tag.success ? findTeamByTag(getDb(), tag.data) : undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const team = await load((await params).tag);
  return { title: team ? `${team.name} [${team.tag}]` : "Team not found" };
}

const joined = new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" });

export default async function TeamPage({ params }: Props) {
  const team = await load((await params).tag);
  if (!team) notFound();

  const db = getDb();
  const viewer = await getMember();
  const [roster, viewerMembership] = await Promise.all([
    listRoster(db, team.id),
    viewer ? findMembershipOf(db, viewer.id) : Promise.resolve(undefined),
  ]);
  const myRole = viewerMembership?.team.id === team.id ? viewerMembership.role : null;
  const inOtherTeam = !!viewerMembership && !myRole;
  const publicCode = myRole ? await activePublicCode(db, team.id) : null;
  const pending = viewer && !viewerMembership && team.joinMode === "open" ? !!(await pendingRequestOf(db, team.id, viewer.id)) : false;
  const canManage = can(myRole, "invite.manage") || can(myRole, "request.decide");

  return (
    <article className="mx-auto max-w-5xl px-4 pt-12 sm:px-6">
      <p className="font-mono text-sm text-green">
        <span aria-hidden="true">$ </span>cat teams/{team.tag}/README
      </p>

      <GlassPanel glow className="mt-6 flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        <EmblemBadge emblem={team.logoKey} size={112} />
        <div className="min-w-0 flex-1">
          <h1 className="font-mono text-3xl font-bold text-fg">{team.name}</h1>
          <p className="mt-1 font-mono text-sm text-green">[{team.tag}]</p>
          <p className="mt-3 font-mono text-xs text-fg-muted">
            {roster.length} {roster.length === 1 ? "member" : "members"} · {JOIN_MODE_LABEL[team.joinMode]} · since{" "}
            {joined.format(team.createdAt)}
          </p>
          {team.focusCategories.length > 0 && (
            <p className="mt-3 flex flex-wrap gap-1.5">
              {team.focusCategories.map((f) => (
                <span key={f} className="rounded border border-line px-2 py-0.5 font-mono text-xs text-fg-muted">
                  {f}
                </span>
              ))}
            </p>
          )}
        </div>
        {canManage && (
          <NeonButton href={`/teams/${team.tag}/manage`} variant="ghost">
            manage
          </NeonButton>
        )}
      </GlassPanel>

      {team.bio && <p className="mt-6 max-w-2xl leading-relaxed text-fg-muted">{team.bio}</p>}

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <section aria-labelledby="roster-h">
          <h2 id="roster-h" className="font-mono text-lg font-bold text-fg">
            roster/
          </h2>
          <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
            {roster.map((m) => (
              <li key={m.userId} className="flex items-center gap-3 px-4 py-3">
                {m.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatarUrl} alt="" width={32} height={32} className="h-8 w-8 rounded border border-line object-cover" />
                ) : (
                  <span className="h-8 w-8 rounded border border-line bg-bg-raised" aria-hidden="true" />
                )}
                <Link href={`/u/${m.handle}`} className="min-w-0 truncate font-mono text-sm text-fg hover:text-green-bright">
                  @{m.handle}
                </Link>
                <span className="ml-auto">
                  <RoleChip role={m.role} />
                </span>
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-6">
          {myRole && publicCode && (
            <div className="glass p-4">
              <p className="text-sm text-fg-muted">Team invite code (members only)</p>
              <p className="mt-2 select-all font-mono text-lg tracking-wider text-green-bright">{publicCode}</p>
            </div>
          )}

          {!viewer && team.joinMode !== "closed" && (
            <div className="glass p-4 text-sm text-fg-muted">
              <p>Sign in to {team.joinMode === "open" ? "request to join or " : ""}use an invite code.</p>
              <div className="mt-4">
                <NeonButton href="/sign-in">sign in</NeonButton>
              </div>
            </div>
          )}

          {viewer && !viewerMembership && team.joinMode === "open" && (
            <div className="glass p-4">
              <RequestToJoin tag={team.tag} pending={pending} />
            </div>
          )}

          {viewer && !viewerMembership && team.joinMode !== "closed" && (
            <p className="text-sm text-fg-muted">
              Got a code?{" "}
              <Link href="/join" className="text-green-bright underline-offset-4 hover:underline">
                Redeem it
              </Link>
              .
            </p>
          )}

          {inOtherTeam && <p className="text-sm text-fg-muted">You&apos;re in another team. Members can only be in one team at a time.</p>}

          {myRole && <LeaveTeam tag={team.tag} isCaptain={myRole === "captain"} alone={roster.length === 1} />}
        </aside>
      </div>
    </article>
  );
}

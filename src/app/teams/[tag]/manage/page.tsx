import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { requireMember } from "@/lib/auth/member";
import { getDb } from "@/lib/db/client";
import { describeAudit } from "@/lib/teams/audit";
import { can } from "@/lib/teams/permissions";
import { findTeamByTag, listAudit, listInvites, listPendingRequests, listRoster, roleIn } from "@/lib/teams/queries";
import { emblemFromKey, tagParamSchema } from "@/lib/teams/validation";
import { EmblemBadge } from "@/components/teams/EmblemBadge";
import { CreateInvitePanel, IdentityPanel, MemberControls, ProfilePanel, RequestDecision, RevokeButton } from "./Panels";

export const metadata: Metadata = { title: "Manage team" };

type Props = { params: Promise<{ tag: string }> };

const when = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

function Panel({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="glass bracketed p-6">
      <h2 id={id} className="font-display text-lg font-semibold tracking-tight text-fg">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function ManageTeamPage({ params }: Props) {
  const member = await requireMember();
  const tag = tagParamSchema.safeParse((await params).tag);
  if (!tag.success) notFound();
  const db = getDb();
  const team = await findTeamByTag(db, tag.data);
  if (!team) notFound();

  // Authorization: only captains and co-captains see this page at all.
  const role = await roleIn(db, team.id, member.id);
  if (!can(role, "invite.manage")) redirect(`/teams/${team.tag}`);

  const [roster, requests, invites, audit] = await Promise.all([
    listRoster(db, team.id),
    listPendingRequests(db, team.id),
    listInvites(db, team.id),
    listAudit(db, team.id),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 pt-12 sm:px-6">
      <header className="flex items-center gap-4">
        <EmblemBadge emblem={team.logoKey} size={56} />
        <div>
          <p className="font-mono text-sm text-green">
            <span aria-hidden="true">$ </span>sudo -u {role?.replace("_", "-")} manage {team.tag}
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">{team.name}</h1>
        </div>
        <Link href={`/teams/${team.tag}`} className="ml-auto font-mono text-sm text-fg-muted hover:text-green-bright">
          ← back to team
        </Link>
      </header>

      <Panel id="requests-h" title={`join requests (${requests.length})`}>
        {requests.length === 0 ? (
          <p className="text-sm text-fg-muted">
            {team.joinMode === "open" ? "No pending requests." : "Requests are off: the team isn't set to “open to requests”."}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="font-mono text-sm text-fg">@{r.handle}</span>
                {r.message && <span className="text-sm text-fg-muted">“{r.message}”</span>}
                <span className="ml-auto">
                  <RequestDecision tag={team.tag} requestId={r.id} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel id="invites-h" title="invite codes">
        <CreateInvitePanel tag={team.tag} />
        {invites.length > 0 && (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="font-mono text-xs text-fg-muted">
                <tr>
                  <th className="py-2 pr-4 font-normal">code</th>
                  <th className="py-2 pr-4 font-normal">type</th>
                  <th className="py-2 pr-4 font-normal">uses</th>
                  <th className="py-2 pr-4 font-normal">expires</th>
                  <th className="py-2 pr-4 font-normal">status</th>
                  <th className="py-2 font-normal" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line font-mono text-xs">
                {invites.map((i) => {
                  const status = i.status;
                  return (
                    <tr key={i.id} className={status === "active" ? "text-fg" : "text-fg-muted/60"}>
                      <td className="py-2 pr-4">{i.display}</td>
                      <td className="py-2 pr-4">{i.isPublic ? "public" : "private"}</td>
                      <td className="py-2 pr-4">
                        {i.uses}
                        {i.maxUses !== null ? ` / ${i.maxUses}` : ""}
                      </td>
                      <td className="py-2 pr-4">{i.expiresAt ? when.format(i.expiresAt) : "never"}</td>
                      <td className={`py-2 pr-4 ${status === "active" ? "text-green-bright" : ""}`}>{status}</td>
                      <td className="py-2 text-right">{status === "active" && <RevokeButton tag={team.tag} inviteId={i.id} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel id="members-h" title={`members (${roster.length})`}>
        <ul className="divide-y divide-line">
          {roster.map((m) => (
            <li key={m.userId} className="flex flex-wrap items-start gap-3 py-3">
              <span className="pt-1 font-mono text-sm text-fg">@{m.handle}</span>
              <span className="ml-auto">
                <MemberControls tag={team.tag} userId={m.userId} handle={m.handle ?? ""} role={m.role} actorRole={role!} isSelf={m.userId === member.id} />
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel id="profile-h" title="profile">
        <ProfilePanel tag={team.tag} bio={team.bio} focus={team.focusCategories} />
      </Panel>

      {can(role, "team.edit_identity") && (
        <Panel id="identity-h" title="identity (captain only)">
          <IdentityPanel tag={team.tag} name={team.name} joinMode={team.joinMode} emblem={emblemFromKey(team.logoKey)} />
        </Panel>
      )}

      <Panel id="audit-h" title="audit log">
        {audit.length === 0 ? (
          <p className="text-sm text-fg-muted">Nothing yet.</p>
        ) : (
          <ol className="space-y-2 font-mono text-xs">
            {audit.map((a) => (
              <li key={a.id} className="flex flex-wrap gap-x-3">
                <time className="text-fg-muted" dateTime={a.createdAt.toISOString()}>
                  {when.format(a.createdAt)} UTC
                </time>
                <span className="text-fg">{describeAudit(a.action, a.actor, a.meta ?? null)}</span>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}

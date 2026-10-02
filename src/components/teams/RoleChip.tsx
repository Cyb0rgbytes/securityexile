import type { TeamRole } from "@/lib/teams/permissions";

const LABEL: Record<TeamRole, string> = {
  captain: "captain",
  co_captain: "co-captain",
  member: "member",
  reserve: "reserve",
};

const STYLE: Record<TeamRole, string> = {
  captain: "border-red/60 text-red-bright",
  co_captain: "border-green/60 text-green-bright",
  member: "border-line-strong text-fg-muted",
  reserve: "border-line text-fg-muted/80",
};

export function RoleChip({ role }: { role: TeamRole }) {
  return <span className={`rounded border px-1.5 py-0.5 font-mono text-[0.7rem] ${STYLE[role]}`}>{LABEL[role]}</span>;
}

export const JOIN_MODE_LABEL = { open: "open to requests", invite: "invite only", closed: "closed" } as const;

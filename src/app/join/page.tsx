import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/member";
import { getDb } from "@/lib/db/client";
import { findMembershipOf } from "@/lib/teams/queries";
import { AuthShell } from "@/components/layout/AuthShell";
import { JoinForm } from "./JoinForm";

export const metadata: Metadata = { title: "Join a team" };

export default async function JoinPage() {
  const member = await requireMember();
  const mine = await findMembershipOf(getDb(), member.id);
  if (mine) redirect(`/teams/${mine.team.tag}`);

  return (
    <AuthShell command="join --code">
      <h1 className="mb-6 self-start font-display text-2xl font-semibold tracking-tight text-fg">Join with a code</h1>
      <JoinForm />
      <p className="mt-4 self-start text-sm text-fg-muted">Codes come from a team&apos;s captain or co-captain.</p>
    </AuthShell>
  );
}

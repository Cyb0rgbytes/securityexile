import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth/member";
import { getDb } from "@/lib/db/client";
import { findMembershipOf } from "@/lib/teams/queries";
import { CreateTeamForm } from "./CreateTeamForm";

export const metadata: Metadata = { title: "Create a team" };

export default async function NewTeamPage() {
  const member = await requireMember();
  const mine = await findMembershipOf(getDb(), member.id);
  if (mine) redirect(`/teams/${mine.team.tag}`);

  return (
    <section className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
      <p className="font-mono text-sm text-green">
        <span aria-hidden="true">$ </span>mkdir teams/new
      </p>
      <h1 className="mt-2 font-mono text-3xl font-bold text-fg">Create a team</h1>
      <p className="mt-2 text-fg-muted">You&apos;ll be the captain. You can change everything later.</p>
      <div className="mt-8">
        <CreateTeamForm />
      </div>
    </section>
  );
}

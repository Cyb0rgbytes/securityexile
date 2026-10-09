import "server-only";
import { getMember } from "@/lib/auth/member";
import type { Db } from "@/lib/db/client";
import type { User } from "@/lib/db/schema";
import { findMembershipOf } from "@/lib/teams/queries";
import type { Viewer } from "./visibility";

export async function loadWriteupViewer(db: Db): Promise<Viewer & { member: User | null }> {
  const m = await getMember();
  if (!m?.handle) return { member: null, userId: null, teamId: null, platformRole: "member" };
  const membership = await findMembershipOf(db, m.id);
  return { member: m, userId: m.id, teamId: membership?.team.id ?? null, platformRole: m.platformRole };
}

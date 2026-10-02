"use server";

import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { getMember } from "@/lib/auth/member";
import { getDb } from "@/lib/db/client";
import { isUniqueViolation } from "@/lib/db/errors";
import { users } from "@/lib/db/schema";
import { handleSchema } from "@/lib/validation/handle";

export interface ClaimHandleState {
  error?: string;
  /** echo the attempted value so the input keeps it after an error */
  value?: string;
}

export async function claimHandle(_prev: ClaimHandleState, form: FormData): Promise<ClaimHandleState> {
  // Authorize on the server, never from the form.
  const member = await getMember();
  if (!member) redirect("/sign-in");
  if (member.handle) redirect(`/u/${member.handle}`);

  const raw = String(form.get("handle") ?? "");
  const parsed = handleSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid handle.", value: raw };
  const handle = parsed.data;

  const db = getDb();
  const taken = await db.query.users.findFirst({ columns: { id: true }, where: eq(users.handle, handle) });
  if (taken) return { error: "That handle is taken.", value: raw };

  try {
    // `handle is null` makes the claim one-time even if two submits race.
    await db
      .update(users)
      .set({ handle })
      .where(and(eq(users.id, member.id), isNull(users.handle)));
  } catch (e) {
    // The UNIQUE constraint is the real guard against a concurrent claim.
    if (isUniqueViolation(e, "users.handle")) return { error: "That handle is taken.", value: raw };
    throw e;
  }

  redirect(`/u/${handle}`);
}

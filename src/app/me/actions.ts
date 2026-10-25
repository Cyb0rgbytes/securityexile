"use server";

/*
 * Profile mutations. Same order as everywhere else:
 *   requireMember → validate → rate limit → write → revalidate.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMember } from "@/lib/auth/member";
import { getDb, getEnv } from "@/lib/db/client";
import { awardSecret } from "@/lib/profile/queries";
import { badgeForPhrase } from "@/lib/profile/secrets";
import { hit, LIMITS, retryMessage } from "@/lib/security/rate-limit";
import type { ActionState } from "@/app/teams/actions";

const phraseSchema = z.string().trim().min(3).max(120);

/**
 * Redeem an easter-egg phrase for its badge.
 *
 * The palette calls this with whatever was typed when nothing matched, so most calls are
 * ordinary mis-typed searches: a miss is silent and indistinguishable from a wrong phrase,
 * which keeps the answers from being probed for. The mapping lives server-side, and the
 * rate limit is the brute-force budget.
 */
export async function redeemSecret(raw: string): Promise<ActionState> {
  const member = await requireMember();
  const parsed = phraseSchema.safeParse(raw);
  if (!parsed.success) return {};

  const rl = await hit(getEnv(), `secret:${member.id}`, LIMITS.secretRedeem);
  if (!rl.ok) return { error: retryMessage(rl) };

  const slug = badgeForPhrase(parsed.data);
  if (!slug) return {};

  const awarded = await awardSecret(getDb(), member.id, slug);
  if (!awarded) return {};
  if (member.handle) revalidatePath(`/u/${member.handle}`);
  return { ok: `Badge unlocked: ${awarded.name}.` };
}

import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { newId } from "@/lib/db/ids";
import { users, type User } from "@/lib/db/schema";

/**
 * The signed-in member's row, created on first sight.
 *
 * Users are synced lazily instead of via Clerk webhooks so local development
 * works without a public URL. Profile fields are copied once at creation;
 * a user.updated webhook keeps them fresh once deployed (Phase 7).
 *
 * Cached per request so layouts and pages can both call it for one query.
 */
export const getMember = cache(async (): Promise<User | null> => {
  const { userId } = await auth();
  if (!userId) return null;

  const db = getDb();
  const existing = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
  if (existing) return existing;

  const cu = await currentUser();
  if (!cu) return null;

  const displayName = [cu.firstName, cu.lastName].filter(Boolean).join(" ") || cu.username || null;
  // onConflictDoNothing covers two first requests racing each other.
  await db
    .insert(users)
    .values({ id: newId(), clerkId: userId, displayName, avatarUrl: cu.imageUrl })
    .onConflictDoNothing({ target: users.clerkId });

  return (await db.query.users.findFirst({ where: eq(users.clerkId, userId) })) ?? null;
});

/** A member who has finished onboarding (has a handle). */
export type OnboardedMember = User & { handle: string };

/**
 * Server-side gate for member-only pages and actions. Never trust the client:
 * every action that changes data calls this (or a stricter role check) itself.
 */
export async function requireMember(): Promise<OnboardedMember> {
  const member = await getMember();
  if (!member) redirect("/sign-in");
  if (!member.handle) redirect("/onboarding");
  return member as OnboardedMember;
}

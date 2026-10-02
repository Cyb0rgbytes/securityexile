import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getMember } from "@/lib/auth/member";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { NeonButton } from "@/components/ui/NeonButton";

type Props = { params: Promise<{ handle: string }> };

async function findByHandle(handle: string) {
  return getDb().query.users.findFirst({
    // Only public fields leave the server.
    columns: { handle: true, displayName: true, avatarUrl: true, bio: true, xp: true, rankTier: true, createdAt: true },
    where: eq(users.handle, handle.toLowerCase()),
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const user = await findByHandle(handle);
  return { title: user ? `@${user.handle}` : "Unknown operator" };
}

const joined = new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" });

export default async function DossierPage({ params }: Props) {
  const { handle } = await params;
  const user = await findByHandle(handle);
  if (!user?.handle) notFound();

  const viewer = await getMember();
  const isSelf = viewer?.handle === user.handle;

  return (
    <article className="mx-auto max-w-4xl px-4 pt-12 sm:px-6">
      <p className="font-mono text-sm text-green">
        <span aria-hidden="true">$ </span>finger {user.handle}
      </p>

      <GlassPanel glow className="mt-6 flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        {user.avatarUrl && (
          // Clerk-hosted avatar (img.clerk.com); allowed by CSP img-src.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            width={96}
            height={96}
            className="h-24 w-24 rounded-md border border-line-strong object-cover"
          />
        )}
        <div className="min-w-0">
          <h1 className="truncate font-mono text-3xl font-bold text-fg">@{user.handle}</h1>
          {user.displayName && <p className="mt-1 text-fg-muted">{user.displayName}</p>}
          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 font-mono text-sm">
            <div>
              <dt className="inline text-fg-muted">rank </dt>
              <dd className="inline text-green-bright">{user.rankTier}</dd>
            </div>
            <div>
              <dt className="inline text-fg-muted">xp </dt>
              <dd className="inline text-green-bright">{user.xp}</dd>
            </div>
            <div>
              <dt className="inline text-fg-muted">joined </dt>
              <dd className="inline text-fg">{joined.format(user.createdAt)}</dd>
            </div>
          </dl>
        </div>
      </GlassPanel>

      {user.bio && <p className="mt-6 max-w-2xl leading-relaxed text-fg-muted">{user.bio}</p>}

      <section aria-labelledby="writeups-h" className="mt-10">
        <h2 id="writeups-h" className="font-mono text-lg font-bold text-fg">
          writeups/
        </h2>
        <div className="glass bracketed mt-4 p-6 text-sm text-fg-muted">
          {isSelf ? (
            <>
              <p>No writeups yet. Your first one will show up here.</p>
              <div className="mt-4">
                <NeonButton href="/writeups" variant="ghost">
                  browse writeups
                </NeonButton>
              </div>
            </>
          ) : (
            <p>@{user.handle} hasn&apos;t published anything yet.</p>
          )}
        </div>
      </section>
    </article>
  );
}

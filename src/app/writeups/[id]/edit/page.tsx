import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CursorHeading } from "@/components/fx/CursorHeading";
import { Editor } from "@/components/writeups/Editor";
import { DeleteWriteup, PublishToggle } from "@/components/writeups/WriteupActions";
import { requireMember } from "@/lib/auth/member";
import { getDb } from "@/lib/db/client";
import { canEditWriteup } from "@/lib/writeups/permissions";
import { findWriteupById, tagsOf } from "@/lib/writeups/queries";
import { idSchema } from "@/lib/writeups/validation";
import { editorChoices } from "@/lib/writeups/editor-choices";

export const metadata: Metadata = { title: "Edit writeup", robots: { index: false } };

export default async function EditWriteupPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const member = await requireMember();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const db = getDb();
  const w = await findWriteupById(db, id);
  if (!w || !canEditWriteup(w, member.id)) notFound();
  const [tags, choices] = await Promise.all([tagsOf(db, w.id), editorChoices(member.id)]);
  return (
    <article className="mx-auto max-w-4xl px-4 pt-12 sm:px-6">
      <div className="flex flex-wrap items-end gap-4">
        <CursorHeading level={1} prompt="#">edit writeup</CursorHeading>
        <div className="ml-auto flex flex-wrap items-center gap-4">
          {w.publishedAt && <Link href={`/w/${member.handle}/${w.slug}`} className="font-mono text-sm text-fg-muted hover:text-green-bright">view</Link>}
          <PublishToggle id={w.id} published={!!w.publishedAt} />
        </div>
      </div>
      <div className="mt-8">
        <Editor
          initial={{
            id: w.id, title: w.title, bodyMd: w.bodyMd, category: w.category ?? "", difficulty: w.difficulty ?? "", tags: tags.join(", "),
            eventId: w.eventId ?? "", seriesId: w.seriesId ?? "", seriesOrder: w.seriesOrder ? String(w.seriesOrder) : "", asTeam: !!w.teamId,
            published: !!w.publishedAt, updatedAt: w.updatedAt.getTime(),
          }}
          {...choices}
        />
      </div>
      <div className="mt-10"><DeleteWriteup id={w.id} /></div>
    </article>
  );
}

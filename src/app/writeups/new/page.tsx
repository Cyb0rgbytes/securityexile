import type { Metadata } from "next";
import { connection } from "next/server";
import { CursorHeading } from "@/components/fx/CursorHeading";
import { Editor } from "@/components/writeups/Editor";
import { requireMember } from "@/lib/auth/member";
import { editorChoices } from "@/lib/writeups/editor-choices";

export const metadata: Metadata = { title: "New writeup", robots: { index: false } };

export default async function NewWriteupPage() {
  await connection();
  const member = await requireMember();
  const choices = await editorChoices(member.id);
  return (
    <article className="mx-auto max-w-4xl px-4 pt-12 sm:px-6">
      <CursorHeading level={1} prompt="#">new writeup</CursorHeading>
      <div className="mt-8">
        <Editor
          initial={{ id: null, title: "", bodyMd: "", category: "", difficulty: "", tags: "", eventId: "", seriesId: "", seriesOrder: "", asTeam: false, published: false, updatedAt: 0 }}
          {...choices}
        />
      </div>
    </article>
  );
}

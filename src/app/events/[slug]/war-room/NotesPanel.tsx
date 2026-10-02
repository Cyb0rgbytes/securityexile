"use client";

import { useActionState, useState } from "react";
import { FormMessage, inputCls, SubmitButton } from "@/components/teams/FormBits";
import { MarkdownView } from "@/components/markdown/MarkdownView";
import { saveTeamNotes, type NotesState } from "./actions";

export function NotesPanel({ slug, notes, updatedAt, writable }: { slug: string; notes: string; updatedAt: number; writable: boolean }) {
  // The version the editor started from; a save is refused if a teammate saved since.
  const [base, setBase] = useState<number | null>(null);
  // Controlled so a refused save keeps the text (React resets uncontrolled fields after actions).
  const [draft, setDraft] = useState(notes);
  const [state, action] = useActionState<NotesState, FormData>(saveTeamNotes.bind(null, slug), {});
  const editing = base !== null;
  // Newest of: when this editor opened, or our own last successful save.
  const loadedAt = Math.max(base ?? updatedAt, state.ok && state.savedAt ? state.savedAt : 0);
  const toggle = () => {
    if (!editing) setDraft(notes);
    setBase(editing ? null : updatedAt);
  };
  return (
    <section aria-label="Team notes" className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="font-mono text-sm text-green">team notes</h2>
        {writable && (
          <button type="button" onClick={toggle} className="font-mono text-xs text-fg-muted hover:text-fg">
            {editing ? "done" : "edit"}
          </button>
        )}
      </div>
      {editing ? (
        <form action={action} className="space-y-2">
          <input type="hidden" name="loadedAt" value={loadedAt} />
          <label htmlFor="team-notes" className="sr-only">
            Team notes
          </label>
          <textarea
            id="team-notes"
            name="notes"
            rows={14}
            maxLength={20_000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className={inputCls}
            placeholder="Strategy, VPN details, flag format, who's on what"
          />
          <FormMessage state={state} />
          <SubmitButton variant="ghost" pending="saving…">
            save notes
          </SubmitButton>
        </form>
      ) : (
        <MarkdownView source={notes} />
      )}
    </section>
  );
}

"use client";

import { useActionState, useState, useTransition } from "react";
import type { ActionState } from "@/app/teams/actions";
import { FormMessage, inputCls, SubmitButton } from "@/components/teams/FormBits";
import { MarkdownView } from "@/components/markdown/MarkdownView";
import { MOVES, nextStatus, type ChallengeStatus, type Move } from "@/lib/events/permissions";
import { deleteChallenge, moveChallenge, saveChallengeNotes } from "./actions";

export interface CardData {
  id: string;
  name: string;
  category: string | null;
  points: number | null;
  status: ChallengeStatus;
  claimer: string | null;
  claimedByMe: boolean;
  createdByMe: boolean;
  notes: string;
  links: { label: string; url: string }[];
}

const LABEL: Record<Move, string> = { claim: "claim", start: "start solving", solve: "mark solved", release: "release", reopen: "reopen" };

export function ChallengeCard({ slug, c, isLead, writable }: { slug: string; c: CardData; isLead: boolean; writable: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionState>({});
  const [notesState, notesAction] = useActionState<ActionState, FormData>(saveChallengeNotes.bind(null, slug, c.id), {});
  // Controlled: React resets uncontrolled fields after every action, which would wipe text on an error.
  const linksText = c.links.map((l) => `${l.label} | ${l.url}`).join("\n");
  const [notesDraft, setNotesDraft] = useState(c.notes);
  const [linksDraft, setLinksDraft] = useState(linksText);
  // `base` is the server version the draft started from (sent with the save, so a
  // teammate's newer edit isn't overwritten); `seen` is the last version rendered.
  const [base, setBase] = useState({ notes: c.notes, links: c.links });
  const [seen, setSeen] = useState({ notes: c.notes, links: linksText });
  if (seen.notes !== c.notes || seen.links !== linksText) {
    // Auto-refresh brought a new version: adopt it unless the user has unsaved edits.
    const untouched = notesDraft === seen.notes && linksDraft === seen.links;
    const alreadySame = notesDraft === c.notes && linksDraft === linksText;
    setSeen({ notes: c.notes, links: linksText });
    if (untouched || alreadySame) {
      setNotesDraft(c.notes);
      setLinksDraft(linksText);
      setBase({ notes: c.notes, links: c.links });
    }
  }
  const stale = base.notes !== c.notes || JSON.stringify(base.links) !== JSON.stringify(c.links);
  const loadLatest = () => {
    setNotesDraft(c.notes);
    setLinksDraft(linksText);
    setBase({ notes: c.notes, links: c.links });
  };
  const moves = MOVES.filter((m) => nextStatus(c.status, m, { isClaimer: c.claimedByMe, isLead }));
  const run = (fn: () => Promise<ActionState>) => start(async () => setMsg(await fn()));

  return (
    <li className="rounded border border-line bg-bg-deep/70 p-3">
      <p className="truncate font-mono text-sm text-fg" title={c.name}>
        {c.name}
      </p>
      <p className="font-mono text-xs text-fg-muted">
        {c.category ?? "misc"}
        {c.points !== null && ` · ${c.points} pts`}
        {c.claimer && c.status !== "open" && ` · @${c.claimer}`}
      </p>
      {writable && moves.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {moves.map((m) => (
            <button
              key={m}
              type="button"
              disabled={pending}
              onClick={() => run(() => moveChallenge(slug, c.id, m))}
              className={`rounded px-2 py-0.5 font-mono text-xs disabled:opacity-60 ${m === "solve" ? "bg-green text-bg-deep hover:bg-green-bright" : "border border-line-strong text-fg hover:border-green-bright"}`}
            >
              {LABEL[m]}
            </button>
          ))}
        </div>
      )}
      <FormMessage state={msg} />
      <details className="mt-2">
        <summary className="cursor-pointer font-mono text-xs text-fg-muted hover:text-fg">
          notes & links{c.links.length > 0 && ` (${c.links.length})`}
        </summary>
        <div className="mt-2 space-y-3">
          <MarkdownView source={c.notes} />
          {c.links.length > 0 && (
            <ul className="space-y-1">
              {c.links.map((l) => (
                <li key={l.url}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="text-sm text-green-bright underline-offset-4 hover:underline">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
          {writable && (
            <form action={notesAction} className="space-y-2">
              <input type="hidden" name="baseNotes" value={base.notes} />
              <input type="hidden" name="baseLinks" value={JSON.stringify(base.links)} />
              <label htmlFor={`n-${c.id}`} className="sr-only">
                Notes for {c.name}
              </label>
              <textarea id={`n-${c.id}`} name="notes" rows={5} maxLength={10_000} value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} className={inputCls} placeholder="Markdown: findings, payloads, dead ends" />
              <label htmlFor={`l-${c.id}`} className="block text-xs text-fg-muted">
                Links, one per line: <span className="font-mono">label | https://…</span>
              </label>
              <textarea id={`l-${c.id}`} name="links" rows={2} value={linksDraft} onChange={(e) => setLinksDraft(e.target.value)} className={inputCls} />
              <FormMessage state={notesState} />
              <div className="flex items-center gap-3">
                <SubmitButton variant="ghost" className="!py-1 !text-xs" pending="saving…">
                  save notes
                </SubmitButton>
                {stale && (
                  <button type="button" onClick={loadLatest} className="font-mono text-xs text-red-bright hover:text-fg">
                    load latest (replaces your draft)
                  </button>
                )}
                {(isLead || c.createdByMe) && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (confirm(`Delete ${c.name}?`)) run(() => deleteChallenge(slug, c.id));
                    }}
                    className="font-mono text-xs text-fg-muted hover:text-red-bright"
                  >
                    delete
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </details>
    </li>
  );
}

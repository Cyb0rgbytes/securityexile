"use client";

import { useState, useTransition } from "react";
import { toggleBookmark, toggleVote } from "./actions";

export function Social({ writeupId, votes, voted, saved, canVote, signedIn }: { writeupId: string; votes: number; voted: boolean; saved: boolean; canVote: boolean; signedIn: boolean }) {
  const [state, setState] = useState({ votes, voted, saved, error: "" });
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const vote = () => start(async () => {
    const r = await toggleVote(writeupId);
    setState((s) => (r.error ? { ...s, error: r.error } : { ...s, error: "", voted: !!r.voted, votes: r.count ?? s.votes }));
  });
  const save = () => start(async () => {
    const r = await toggleBookmark(writeupId);
    setState((s) => (r.error ? { ...s, error: r.error } : { ...s, error: "", saved: !!r.saved }));
  });
  return (
    <div className="flex flex-wrap items-center gap-3 font-mono text-sm">
      <button type="button" disabled={pending || !signedIn || !canVote} onClick={vote} aria-pressed={state.voted}
        className={`rounded border px-3 py-1 disabled:opacity-60 ${state.voted ? "border-green-bright text-green-bright" : "border-line-strong text-fg hover:border-green-bright"}`}>
        ▲ {state.votes} {state.voted ? "upvoted" : "upvote"}
      </button>
      {signedIn && (
        <button type="button" disabled={pending} onClick={save} aria-pressed={state.saved} className="rounded border border-line-strong px-3 py-1 text-fg hover:border-green-bright disabled:opacity-60">
          {state.saved ? "bookmarked" : "bookmark"}
        </button>
      )}
      <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(location.href); setCopied(true); } catch {} }} className="text-fg-muted hover:text-fg">
        {copied ? "link copied" : "copy link"}
      </button>
      {state.error && <span role="alert" className="text-red-bright">{state.error}</span>}
    </div>
  );
}

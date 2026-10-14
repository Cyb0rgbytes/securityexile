"use client";

import { useState, useTransition } from "react";
import { ShareButton } from "@/components/share/ShareButton";
import { toggleBookmark, toggleHeart, toggleVote } from "./actions";

type Props = { writeupId: string; title: string; votes: number; voted: boolean; hearts: number; loved: boolean; saved: boolean; canVote: boolean; signedIn: boolean };

export function Social({ writeupId, title, votes, voted, hearts, loved, saved, canVote, signedIn }: Props) {
  const [state, setState] = useState({ votes, voted, hearts, loved, saved, error: "" });
  const [pending, start] = useTransition();
  const vote = () => start(async () => {
    const r = await toggleVote(writeupId);
    setState((s) => (r.error ? { ...s, error: r.error } : { ...s, error: "", voted: !!r.voted, votes: r.count ?? s.votes }));
  });
  const love = () => start(async () => {
    const r = await toggleHeart(writeupId);
    setState((s) => (r.error ? { ...s, error: r.error } : { ...s, error: "", loved: !!r.loved, hearts: r.count ?? s.hearts }));
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
      <button type="button" disabled={pending || !signedIn || !canVote} onClick={love} aria-pressed={state.loved} aria-label={state.loved ? "Remove love" : "Love this writeup"}
        className={`rounded border px-3 py-1 disabled:opacity-60 ${state.loved ? "border-red-bright text-red-bright" : "border-line-strong text-fg hover:border-red-bright"}`}>
        {state.loved ? "♥" : "♡"} {state.hearts}
      </button>
      {signedIn && (
        <button type="button" disabled={pending} onClick={save} aria-pressed={state.saved} className="rounded border border-line-strong px-3 py-1 text-fg hover:border-green-bright disabled:opacity-60">
          {state.saved ? "bookmarked" : "bookmark"}
        </button>
      )}
      <ShareButton title={title} />
      {state.error && <span role="alert" className="text-red-bright">{state.error}</span>}
    </div>
  );
}

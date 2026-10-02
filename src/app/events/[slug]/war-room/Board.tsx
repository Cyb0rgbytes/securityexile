"use client";

import { useState } from "react";
import type { ChallengeStatus } from "@/lib/events/permissions";
import { ChallengeCard, type CardData } from "./ChallengeCard";

const COLS: ChallengeStatus[] = ["open", "claimed", "solving", "solved"];

/** Four status columns on wide screens; tabs on narrow ones. */
export function Board({ slug, cards, isLead, writable }: { slug: string; cards: CardData[]; isLead: boolean; writable: boolean }) {
  const [tab, setTab] = useState<ChallengeStatus>("open");
  const by = (s: ChallengeStatus) => cards.filter((c) => c.status === s);
  return (
    <div>
      <div role="tablist" aria-label="Challenge status" className="flex flex-wrap gap-2 font-mono text-xs lg:hidden">
        {COLS.map((s) => (
          <button
            key={s}
            role="tab"
            type="button"
            aria-selected={tab === s}
            onClick={() => setTab(s)}
            className={`rounded border px-2 py-1 ${tab === s ? "border-green-bright text-green-bright" : "border-line-strong text-fg-muted"}`}
          >
            {s} ({by(s).length})
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:mt-0 lg:grid-cols-4">
        {COLS.map((s) => (
          <section key={s} aria-label={`${s} challenges`} className={tab === s ? "" : "hidden lg:block"}>
            <h2 className="hidden font-mono text-sm text-green lg:block">
              {s} ({by(s).length})
            </h2>
            <ul className="mt-2 space-y-2">
              {by(s).map((c) => (
                <ChallengeCard key={c.id} slug={slug} c={c} isLead={isLead} writable={writable} />
              ))}
              {by(s).length === 0 && <li className="font-mono text-xs text-fg-muted">empty</li>}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

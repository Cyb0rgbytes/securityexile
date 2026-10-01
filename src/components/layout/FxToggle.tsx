"use client";

import { useFx } from "@/lib/fx/FxProvider";
import type { FxPreference } from "@/lib/fx/resolve";

const NEXT: Record<FxPreference, FxPreference> = { auto: "low", low: "full", full: "auto" };
const LABEL: Record<FxPreference, string> = { auto: "fx:auto", low: "fx:low", full: "fx:full" };

/** Cycles auto → low → full. "auto" follows the device + reduced-motion policy. */
export function FxToggle() {
  const { preference, level, setPreference } = useFx();
  return (
    <button
      type="button"
      onClick={() => setPreference(NEXT[preference])}
      className="rounded border border-line px-2 py-1 font-mono text-xs text-fg-muted transition-colors hover:border-line-strong hover:text-green-bright"
      aria-label={`Visual effects: ${preference}${level ? `, currently ${level}` : ""}. Click to change.`}
      title="Toggle visual effects"
    >
      {LABEL[preference]}
    </button>
  );
}

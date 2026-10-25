"use client";

import type { Dict } from "@/lib/i18n";
import { useFx } from "@/lib/fx/FxProvider";
import type { FxPreference } from "@/lib/fx/resolve";

const NEXT: Record<FxPreference, FxPreference> = { auto: "low", low: "full", full: "auto" };
/** Terminal tokens, the same in both languages; the accessible name carries the translation. */
const LABEL: Record<FxPreference, string> = { auto: "fx:auto", low: "fx:low", full: "fx:full" };

/** Cycles auto → low → full. "auto" follows the device + reduced-motion policy. */
export function FxToggle({ t }: { t: Dict["chrome"]["fx"] }) {
  const { preference, level, setPreference } = useFx();
  return (
    <button
      type="button"
      onClick={() => setPreference(NEXT[preference])}
      className="rounded-sm border border-line px-2 py-1 font-mono text-xs text-fg-muted transition-colors hover:border-line-strong hover:text-green-bright"
      aria-label={`${t.label}: ${LABEL[preference]}${level ? `, ${t.currently} ${level}` : ""}. ${t.change}`}
      title={t.toggle}
    >
      {LABEL[preference]}
    </button>
  );
}

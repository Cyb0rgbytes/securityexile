export type FxLevel = "full" | "low";

/** What the user picked in the FX toggle. "auto" means "decide for me". */
export type FxPreference = "auto" | FxLevel;

export const FX_STORAGE_KEY = "se-fx";

/** Device/browser signals gathered on the client. */
export interface FxSignals {
  /** matchMedia("(prefers-reduced-motion: reduce)") */
  reducedMotion: boolean;
  /** navigator.deviceMemory in GB, undefined where the API is missing (Safari/Firefox). */
  deviceMemory?: number;
  /** navigator.hardwareConcurrency, undefined if unavailable. */
  cpuCores?: number;
  /** window.innerWidth in CSS px. */
  viewportWidth: number;
  /** true if a WebGL context could be created. */
  webgl: boolean;
}

/**
 * Decide whether heavy effects (WebGL hero, matrix rain, scanlines, glitch)
 * should run.
 *
 * TODO(you): this is the policy that decides who gets the full show.
 * Current body is a minimal placeholder that only honours the explicit
 * toggle and reduced-motion. Things worth deciding:
 *   - Should an explicit "full" override prefers-reduced-motion? (a11y vs. user choice)
 *   - Should low-memory / few-core devices or narrow phones default to "low"?
 *   - What happens when webgl === false? (the hero can't render at all)
 */
export function resolveFxLevel(pref: FxPreference, s: FxSignals): FxLevel {
  if (pref !== "auto") return pref;
  return s.reducedMotion ? "low" : "full";
}

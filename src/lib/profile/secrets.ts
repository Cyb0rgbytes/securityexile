import "server-only";
import { normalizePhrase } from "./badges";

/**
 * Easter eggs: the phrase a member has to find, and the badge it unlocks.
 *
 * server-only, and imported solely by the redeem action, so the answers never reach the
 * client bundle. Where each phrase is planted:
 *   wiretap  — the x-shinobi-scroll response header (src/proxy.ts)
 *   scout    — hidden in the source of the 404 page (src/app/not-found.tsx)
 *
 * Phrases are long enough that guessing them is hopeless against the redeem rate limit.
 */
const PHRASES: Record<string, string> = {
  "the quiet one listens at the wire": "wiretap",
  "nothing here is still something": "scout",
};

/** The badge a submitted phrase unlocks, or null. */
export function badgeForPhrase(raw: string): string | null {
  return PHRASES[normalizePhrase(raw)] ?? null;
}

/** The planted strings, so the places that hide them don't hard-code a second copy. */
export const SECRET_PHRASE = {
  wiretap: "the quiet one listens at the wire",
  scout: "nothing here is still something",
} as const;

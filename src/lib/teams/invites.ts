/**
 * Invite codes: TEAM-XXXX-XXXX in Crockford base32 (40 random bits).
 *
 * Only an HMAC of the normalized code is stored. Private codes are shown to
 * the creator once; the DB keeps a 2-char hint so captains can tell them
 * apart. Public codes are meant to be shared, so their plaintext is kept too.
 */

// Crockford base32: no I, L, O, U (avoids ambiguity and accidental words).
export const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const BODY_LEN = 8;

/** Generates a fresh code like "TEAM-7F3K-Q9ZD". */
export function generateInviteCode(random: (n: number) => Uint8Array = randomBytes): string {
  const bytes = random(BODY_LEN);
  let body = "";
  // 256 is a multiple of 32, so `% 32` is unbiased.
  for (const b of bytes) body += ALPHABET[b % 32];
  return `TEAM-${body.slice(0, 4)}-${body.slice(4)}`;
}

function randomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

/**
 * Canonical form used for hashing: the 8 body characters, uppercase.
 * Accepts lowercase, missing/extra separators, a missing "TEAM" prefix and
 * Crockford's look-alikes (I/L → 1, O → 0). Returns null if it can't be a code.
 */
export function normalizeInviteCode(input: string): string | null {
  let s = input.toUpperCase().replace(/[\s\-_.]/g, "");
  if (s.startsWith("TEAM")) s = s.slice(4);
  s = s.replace(/[IL]/g, "1").replace(/O/g, "0");
  if (s.length !== BODY_LEN) return null;
  for (const ch of s) if (!ALPHABET.includes(ch)) return null;
  return s;
}

/** Display form of a normalized body: "TEAM-XXXX-XXXX". */
export function formatInviteCode(body: string): string {
  return `TEAM-${body.slice(0, 4)}-${body.slice(4)}`;
}

/** Masked display for private codes: "TEAM-••••-••7Q". */
export function maskedHint(body: string): string {
  return `TEAM-••••-••${body.slice(-2)}`;
}

const enc = new TextEncoder();

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** HMAC-SHA256(pepper, "invite:" + body). Domain-separated from other HMAC uses. */
export function hashInviteCode(body: string, pepper: string): Promise<string> {
  return hmacHex(pepper, `invite:${body}`);
}

/** HMAC of an IP address, so redemption logs never hold raw IPs. */
export function hashIp(ip: string, pepper: string): Promise<string> {
  return hmacHex(pepper, `ip:${ip}`);
}

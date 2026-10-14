/**
 * Where sign-in/up happen. Dev and previews use the embedded pages (/sign-in, /sign-up).
 * Production sets these to Clerk's Account Portal on accounts.securityexile.com
 * (docs/DOMAINS.md); the embedded routes then forward there.
 * NEXT_PUBLIC_* values are inlined at build time, so they must be set as build variables.
 */
export const SIGN_IN_URL = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || "/sign-in";
export const SIGN_UP_URL = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || "/sign-up";

/** Sign-in lives on a separate auth host. */
export const usesAccountPortal = /^https:\/\//.test(SIGN_IN_URL);

/** Forwards the query (e.g. redirect_url) onto the Account Portal URL. */
export function portalUrl(base: string, search: Record<string, string | string[] | undefined>): string {
  const url = new URL(base);
  for (const [k, v] of Object.entries(search)) if (typeof v === "string") url.searchParams.set(k, v);
  return url.toString();
}

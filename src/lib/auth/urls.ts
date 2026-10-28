import { APEX_HOST } from "@/lib/site/hosts";

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

/**
 * A post-sign-in destination we're willing to send someone to: a path on this site, or an https
 * URL on securityexile.com or one of its subdomains. Anything else (another domain, "//evil",
 * "/\evil", javascript:) would let a link on our domain hand a fresh session to a lookalike page.
 */
export function isOwnDestination(raw: string): boolean {
  if (/^\/(?![/\\])/.test(raw)) return true;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && (u.hostname === APEX_HOST || u.hostname.endsWith(`.${APEX_HOST}`));
  } catch {
    return false;
  }
}

/**
 * Forwards the query (e.g. redirect_url) onto the Account Portal URL. Clerk reads several redirect
 * parameters (redirect_url, sign_in_force_redirect_url, after_sign_up_url, …), so every *url
 * parameter is dropped unless it points back at us. Clerk's own allow-list is the second check.
 */
export function portalUrl(base: string, search: Record<string, string | string[] | undefined>): string {
  const url = new URL(base);
  for (const [k, v] of Object.entries(search)) {
    if (typeof v !== "string") continue;
    if (/url$/i.test(k) && !isOwnDestination(v)) continue;
    url.searchParams.set(k, v);
  }
  return url.toString();
}

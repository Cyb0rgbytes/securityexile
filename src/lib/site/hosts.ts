/**
 * Host split (see docs/DOMAINS.md). One Worker serves both production hosts:
 *   securityexile.com      marketing landing + public policy pages
 *   app.securityexile.com  the community app
 * Any other host (localhost, *.workers.dev previews) is treated as the app, so dev and
 * previews behave exactly as before. Sign-in/up live on Clerk's Account Portal
 * (accounts.securityexile.com), which isn't served by this Worker.
 */
export const APEX_HOST = "securityexile.com";
export const APP_HOST = "app.securityexile.com";
export const SITE_ORIGIN = `https://${APEX_HOST}`;
export const APP_ORIGIN = `https://${APP_HOST}`;

/** Paths the apex serves itself; everything else belongs to the app. */
const APEX_PATHS = [/^\/$/, /^\/security\/?$/, /^\/(robots\.txt|sitemap\.xml|icon\.png|apple-icon\.png|opengraph-image.*)$/, /^\/__clerk(\/|$)/];

/**
 * Where a request should go instead, or null to serve it here.
 * `enabled` is the HOST_SPLIT switch: off until the apex is a Worker custom domain,
 * otherwise app "/" → apex and the old apex → app redirect would loop.
 */
export function hostRedirect(url: URL, opts: { enabled: boolean; signedIn: boolean }): string | null {
  if (!opts.enabled) return null;
  const host = url.hostname.toLowerCase();
  const rest = `${url.pathname}${url.search}`;
  if (host === `www.${APEX_HOST}`) return `${SITE_ORIGIN}${rest}`;
  if (host === APEX_HOST) return APEX_PATHS.some((re) => re.test(url.pathname)) ? null : `${APP_ORIGIN}${rest}`;
  if (host === APP_HOST && url.pathname === "/") return opts.signedIn ? `${APP_ORIGIN}/writeups${url.search}` : `${SITE_ORIGIN}/${url.search}`;
  return null;
}

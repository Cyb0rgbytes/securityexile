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

/** CTF arena and labs (Build Plan stages 2 and 4). Until they launch on their own servers, this Worker shows holding pages. */
export const CTF_HOST = "ctf.securityexile.com";
export const LABS_HOST = "labs.securityexile.com";

/** Paths the apex serves itself; everything else belongs to the app. */
const APEX_PATHS = [/^\/$/, /^\/(security|terms|privacy|ar)\/?$/, /^\/ar\/(terms|privacy)\/?$/, /^\/(robots\.txt|sitemap\.xml|icon\.png|apple-icon\.png|opengraph-image.*)$/, /^\/__clerk(\/|$)/];

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

/**
 * Internal path to render for ctf./labs. while they are holding pages, or null.
 * Not behind HOST_SPLIT: those hosts only reach this Worker once their custom domains are
 * attached, which is exactly when the holding page should show. Assets and Next internals
 * pass through so the page can load its CSS and JS.
 */
export function hostRewrite(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  const product = host === CTF_HOST ? "ctf" : host === LABS_HOST ? "labs" : null;
  if (!product) return null;
  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/assets/") || url.pathname.startsWith("/__clerk")) return null;
  if (/^\/(icon\.png|apple-icon\.png|robots\.txt)$/.test(url.pathname)) return null;
  return `/soon/${product}`;
}

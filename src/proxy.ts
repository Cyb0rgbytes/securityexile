import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Coarse gate: bounce signed-out visitors before rendering member pages.
// The real authorization check lives in server code (requireMember and the
// per-action role checks); this only saves a render.
const isMemberRoute = createRouteMatcher(["/onboarding(.*)", "/settings(.*)"]);

const isDev = process.env.NODE_ENV === "development";

// Clerk: Frontend API (dev instances live on *.clerk.accounts.dev; add the
// production custom domain here if the /__clerk proxy isn't used), avatars on
// img.clerk.com, and Cloudflare Turnstile for bot protection on sign-up.
const CLERK_FAPI = "https://*.clerk.accounts.dev";
const TURNSTILE = "https://challenges.cloudflare.com";
const FILES = "https://files.securityexile.com";

/**
 * Per-request CSP. Scripts need this request's nonce: Next stamps it on its own
 * bootstrap scripts (it reads it back from the request's CSP header), the root
 * layout on the fx init script, and 'strict-dynamic' extends trust to scripts
 * those load (Clerk's JS, then Turnstile). Injected markup can't run script even
 * if a sanitizer is ever bypassed. The host list is a fallback for browsers
 * without 'strict-dynamic'.
 *
 * style-src keeps 'unsafe-inline' (React style props, Framer Motion) and must
 * not get a nonce: browsers ignore 'unsafe-inline' once a nonce is present.
 */
function contentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""} ${CLERK_FAPI} ${TURNSTILE}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: https://img.clerk.com ${FILES}`,
    "font-src 'self'",
    `connect-src 'self'${isDev ? " ws:" : ""} ${CLERK_FAPI}`,
    `frame-src ${TURNSTILE}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

/** 128 random bits, base64 (no characters that need HTML escaping). */
function newNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

export default clerkMiddleware(
  async (auth, req) => {
    if (isMemberRoute(req)) await auth.protect();

    const nonce = newNonce();
    const csp = contentSecurityPolicy(nonce);
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", csp);
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("Content-Security-Policy", csp);
    return res;
  },
  // Session tokens are only accepted when minted for the origin serving this
  // request (app.securityexile.com in production, localhost for dev/preview).
  (req) => ({ authorizedParties: [req.nextUrl.origin] }),
);

export const config = {
  matcher: [
    // Everything except Next internals, our static assets and common file types.
    "/((?!_next|assets/|\\.well-known/|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4|webm|txt)).*)",
    "/(api|trpc)(.*)",
    // Clerk's auto-proxy path (Frontend API through our own domain).
    "/__clerk/:path*",
  ],
};

import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/*
 * Baseline CSP (Phase 1). Next's App Router emits inline bootstrap scripts,
 * so without nonces 'unsafe-inline' is required for script-src. Phase 7 moves
 * to a nonce-based policy via proxy.ts and drops it.
 */
// Clerk: Frontend API (dev instances live on *.clerk.accounts.dev; the
// production custom domain is added at deploy), avatars on img.clerk.com,
// and Cloudflare Turnstile for bot protection on sign-up.
const CLERK_FAPI = "https://*.clerk.accounts.dev";
const TURNSTILE = "https://challenges.cloudflare.com";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${CLERK_FAPI} ${TURNSTILE}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://img.clerk.com",
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

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;

// Enables Cloudflare bindings (D1/R2/KV) in `next dev`.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();

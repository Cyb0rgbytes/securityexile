import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Coarse gate: bounce signed-out visitors before rendering member pages.
// The real authorization check lives in server code (requireMember and the
// per-action role checks); this only saves a render.
const isMemberRoute = createRouteMatcher(["/onboarding(.*)", "/settings(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isMemberRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Everything except Next internals, our static assets and common file types.
    "/((?!_next|assets/|\\.well-known/|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4|webm|txt)).*)",
    "/(api|trpc)(.*)",
    // Clerk's auto-proxy path (Frontend API through our own domain).
    "/__clerk/:path*",
  ],
};

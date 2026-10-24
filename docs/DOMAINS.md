# Domains and subdomains

How Security Exile is split across hosts, what the code does for each, and the dashboard
steps (Cloudflare, Clerk) that the code can't do. The code changes ship switched off. Each
phase below says when to turn its part on.

## Host map

| Host | Serves | Owner |
| --- | --- | --- |
| `securityexile.com` | Landing in English (`/`) and Arabic (`/ar`), `/terms`, `/privacy` (+ `/ar/…`), `/security`, robots/icons | this Worker (`securityexile`) |
| `www.securityexile.com` | 308 → `securityexile.com` | this Worker |
| `app.securityexile.com` | The community app: writeups, events, teams, profiles | this Worker |
| `accounts.securityexile.com` | Sign in / sign up (Clerk Account Portal) | Clerk (hosted) |
| `clerk.securityexile.com` | Clerk Frontend API (session JS, tokens) | Clerk (hosted) |
| `files.securityexile.com` | Writeup images (R2 bucket `security-exile-uploads`) | R2 custom domain |
| `ctf.securityexile.com` | CTF arena (CTFd, Build Plan stage 2). Until it launches: holding page from this Worker | separate VPS later |
| `labs.securityexile.com` | Hands-on labs (Build Plan stage 4). Until it launches: holding page from this Worker | isolated infra later |

Session cookies from a Clerk **production** instance are set on `securityexile.com`, so every
subdomain sees the same signed-in member. A development instance can't share sessions this way.

## What the code does

- `src/lib/site/hosts.ts` `hostRedirect()` is a pure function with unit tests in `hosts.test.ts`. `src/proxy.ts` calls it on every request:
  - `securityexile.com`: serves `/`, `/ar`, `/terms`, `/privacy`, `/ar/terms`, `/ar/privacy`, `/security`, `robots.txt`, icons, OG images and `/__clerk/*`. Everything else gets a **308** to the same path and query on `app.`. Relative links on the landing page (`/writeups`, `/sign-up`) therefore just work.
  - `www.` → apex.
  - `app.securityexile.com/`: signed-in → `/writeups`; signed-out → the apex landing.
  - Any other host (localhost, `*.workers.dev` previews) is untouched.
  - `hostRewrite()` renders `/soon/ctf` or `/soon/labs` for `ctf.` / `labs.`. It isn't behind `HOST_SPLIT`: those hosts only reach this Worker once you attach them as custom domains, and when CTFd or the labs launch you point their DNS at the new servers instead.
  - The whole split is switched by the Worker var `HOST_SPLIT` (`wrangler.jsonc`), which defaults to `"off"`.
- `src/lib/auth/urls.ts` reads `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `_SIGN_UP_URL`.
  - When these are absolute (`https://accounts.…`), `ClerkProvider` sends sign-in there and only allows the app and apex as redirect targets (`allowedRedirectOrigins`).
  - The old `/sign-in` and `/sign-up` routes then forward to the portal, keeping the query string.
  - When unset or relative, the embedded pages are used (dev).
- `src/proxy.ts` CSP allows the Clerk Frontend API on both `*.clerk.accounts.dev` (dev) and `clerk.securityexile.com` (prod). Clerk's script loads under `'strict-dynamic'` via the nonce. `form-action 'self'` is unaffected because the portal is reached by navigation, not form posts.
- `metadataBase` is `https://app.securityexile.com`, so OG images (`opengraph-image.tsx` on events and writeups) resolve to absolute URLs.

## Go-live order

Do these in order. Steps marked **(you)** are dashboard work.

### Phase 1: Writeups on production ✅ done (2026-10-14)
1. `npx wrangler r2 bucket create security-exile-uploads`
2. **(you)** R2 → bucket → Settings → Custom domain `files.securityexile.com`. Add a Transform Rule (response headers) for that host:
   - `X-Content-Type-Options: nosniff`
   - `Content-Security-Policy: default-src 'none'`
3. `npx wrangler d1 migrations apply DB --remote`. This applies 0003 (writeups columns, uploads) and 0004 (hearts, organizer flag). It **must** run before the merge, or every writeup query fails on missing columns.
4. Merge to `main`; Workers Builds deploys.

### Phase 2: Clerk production + `accounts.` subdomain
1. **(you)** Clerk dashboard → create the **Production** instance, application domain `securityexile.com`.
2. **(you)** In Cloudflare DNS, add the CNAMEs Clerk lists, all **DNS only (grey cloud)**. Proxied records break Clerk's certificates.
   - `clerk` → `frontend-api.clerk.services`
   - `accounts` → `accounts.clerk.services`
   - `clkmail`, `clk._domainkey`, `clk2._domainkey` (email)
   
   Wait until Clerk shows every record verified and SSL issued.
3. **(you)** Clerk → Account Portal:
   - brand it (logo `public/assets/brand/falcon-480.webp`; colors from `src/app/globals.css`, teal `#22d3b4`, bg `#070a12`);
   - after sign-up → `https://app.securityexile.com/onboarding`;
   - after sign-in → `https://app.securityexile.com/writeups`.
   
   Then re-enable bot protection (Turnstile) and recreate the social connections with production OAuth credentials.
4. **(you)** Cloudflare → Workers → `securityexile` → Settings:
   - **Build variables** (inlined at build time): `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_…`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL=https://accounts.securityexile.com/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=https://accounts.securityexile.com/sign-up`, `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=https://app.securityexile.com/writeups`, `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=https://app.securityexile.com/onboarding`.
   - **Secret**: `npx wrangler secret put CLERK_SECRET_KEY` (`sk_live_…`). Never put live keys in `.env.local` or git.
5. Redeploy. Check: sign in on `app.` → bounce to `accounts.` → back on `app.` signed in, with no CSP errors in the console.
6. Production users are a fresh Clerk user pool, so dev-instance accounts don't carry over. Rows in `users` are keyed by `clerk_id`, so members re-join and onboard again. Migrate users with Clerk's export/import first if that matters.

### Phase 3: Apex/app split
Do this only after Phase 2, so the apex shares the session.
1. **(you)** Cloudflare → Rules → delete the redirect rule `securityexile.com → app.securityexile.com`.
2. **(you)** Workers → `securityexile` → Settings → Domains & Routes → add custom domains `securityexile.com` and `www.securityexile.com`.
3. Set `"HOST_SPLIT": "on"` in `wrangler.jsonc` and deploy. Check:
   - `curl -sI https://securityexile.com/writeups` → `308 location: https://app.securityexile.com/writeups`
   - `curl -sI https://app.securityexile.com/` (signed out) → `308 location: https://securityexile.com/`
   - `curl -sI https://www.securityexile.com/` → `308` to the apex

### ctf. and labs. holding pages (Build Plan p1-01)
No code switch needed. In Cloudflare → Workers → `securityexile` → Domains & Routes, add custom domains `ctf.securityexile.com` and `labs.securityexile.com`. Check that `curl -s https://ctf.securityexile.com/` shows *The CTF arena is being built*. When CTFd launches, remove `ctf.` from the Worker and point its DNS at the CTFd server (see `docs/STAGE-1-RUNBOOK.md`).

## Granting the organizer role
Organizers can create events and edit or delete any event. They have no moderation or team powers. Per the no-in-app-admin rule, the flag is set only by a reviewed command:

```sh
npx wrangler d1 execute DB --remote --command "update users set is_organizer=1 where handle='<HANDLE>'"
```

Revoke by setting it to `0`. Record each grant in the PR or issue that approved it.

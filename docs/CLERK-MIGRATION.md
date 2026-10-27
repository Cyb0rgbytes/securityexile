# Moving members from the Clerk dev instance to production

Clerk production went live on 2026-10-26 with an empty user pool. Every D1 `users` row still
points at a **development-instance** user, so existing members can't reach their accounts.
`scripts/migrate-clerk-users.mjs` fixes that.

A D1 row is tied to Clerk only by `users.clerk_id`. Writeups, teams, XP and comments hang off
`users.id`, so repointing `clerk_id` moves everything. For each member the script:

- reads the dev user's primary email;
- finds the production user with that email, or creates one (`--create`);
- writes one `update users set clerk_id = … where id = … and clerk_id = …` line to a SQL file.

The script never writes to D1. You review the SQL and run it. Re-running the script is safe: a
moved row is no longer a dev user and is skipped, and a production user that already exists is
matched by email instead of being created twice.

## Keys

Pass both keys as environment variables for the one command. Never save them in a file.

- `CLERK_DEV_SECRET_KEY`: the `sk_test_…` key, which `.env.local` has.
- `CLERK_PROD_SECRET_KEY`: the `sk_live_…` key, from Clerk dashboard → **Production** → API keys.

## Steps

All commands are PowerShell, run from the repo root.

1. **Dry run.** This reads remote D1 and the dev instance only:
   ```powershell
   $env:CLERK_DEV_SECRET_KEY = "sk_test_…"
   npx tsx scripts/migrate-clerk-users.mjs --remote
   ```
   You get one `would` line per member to move. Seed or test rows are reported as `skip`.
2. **Match against production.** Add the live key. This still creates nothing:
   ```powershell
   $env:CLERK_PROD_SECRET_KEY = "sk_live_…"
   npx tsx scripts/migrate-clerk-users.mjs --remote
   ```
   Each member gets one of these lines:
   - `move`: they already signed up on production.
   - `create`: they have no production user yet.
   - `MANUAL`: see below.
3. **Create the missing production users**, then review the SQL file the script prints:
   ```powershell
   npx tsx scripts/migrate-clerk-users.mjs --remote --create
   ```
4. **Apply** the reviewed file:
   ```powershell
   npx wrangler d1 execute DB --remote --file "<path the script printed>"
   ```
5. Clear both variables: `Remove-Item Env:CLERK_DEV_SECRET_KEY, Env:CLERK_PROD_SECRET_KEY`.
6. Re-grant platform roles to the moved rows if needed (`docs/DOMAINS.md`, "Granting the
   organizer role"). Roles live on the D1 row, so a moved row keeps its role.

## `MANUAL` rows

- **"production account already has D1 row …":** the member signed up on production before the
  migration. D1 then has a second row, created at their first production sign-in, that owns the
  production `clerk_id`. If that newer row has no content, delete it and re-run from step 2.
  Check first that it really is empty:
  ```sh
  npx wrangler d1 execute DB --remote --command "select (select count(*) from writeups where author_id='<NEW_ROW_ID>') as writeups, (select count(*) from team_members where user_id='<NEW_ROW_ID>') as teams, (select count(*) from comments where author_id='<NEW_ROW_ID>') as comments"
  npx wrangler d1 execute DB --remote --command "delete from users where id='<NEW_ROW_ID>'"
  ```
  If the newer row does have content, stop. Merging two rows needs a reviewed migration.
- **"dev user has no primary email":** the member signed up with something other than an email.
  Ask them which email they want to use, then create that production user by hand.

## What members need to know

- Their production account has their email but **no password**. They can sign in in one of
  two ways:
  - with the **same social login** as before. Clerk links it by verified email.
  - with email, choosing **"Forgot password?"** to set a new password.
- Their handle, writeups, team and XP are unchanged. Avatars uploaded to Clerk stay as they were.

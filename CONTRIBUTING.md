# Contributing to Security Exile

Security Exile is the community hub (teams, events, writeups, profiles). The CTF arena is a separate project.

## Setup
1. Node 22+, `npm ci`.
2. Copy `.dev.vars.example` to `.dev.vars` and fill in a random `INVITE_PEPPER` (32+ chars).
3. Ask the owner for Clerk development keys; put them in `.env.local`. Never commit either file.
4. `npm run db:migrate:local`, then `npm run dev`.

## Workflow
- Branch from `main`, open a pull request. Pushing to `main` deploys production, so `main` is protected.
- CI must pass: `npm run typecheck`, `npm run lint`, `npm test`.
- Cloudflare builds every branch as a preview version; test there before merging.
- Schema changes need the owner's approval and must be additive on live data (no table rebuilds).

## Security rules
- Authorize every server action on the server: `requireMember()`, load the actor's role from the database, then check permissions.
- Validate every input with Zod. Use the Drizzle query builder; never build SQL strings from input.
- Sanitize any user Markdown/HTML before rendering.
- No admin panels or privileged web endpoints. Platform roles are assigned only by a reviewed database command.
- Never commit secrets, keys, `.env*` or `.dev.vars`.
- Report vulnerabilities privately (see `/security`).

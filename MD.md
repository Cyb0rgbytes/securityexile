You are building "Security Exile", a cybersecurity community platform for CTF players. Act as a senior full-stack engineer and creative director. Work in phases, commit after each phase, and ask me before making irreversible decisions (schema changes after Phase 2, paid services, deployments).

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- Cloudflare Pages/Workers, D1 (database, via Drizzle ORM), R2 (uploads), KV (rate limits/cache)
- Clerk auth with Discord + GitHub OAuth
- React Three Fiber + drei for 3D, Framer Motion for UI motion
- Resend for email notifications

## Core features
1. Teams
   - Create team: name, tag (2–5 chars), logo, bio, focus categories, join mode (open / invite-only / closed)
   - Roles: captain, co-captain, member, reserve; transfer captaincy; kick/leave
   - Join requests for public teams with approve/reject
2. Invite codes
   - Public codes (displayable) and private codes (expiry, max uses, revocable)
   - Format like `TEAM-XXXX-XXXX`; store only a hash; log every redemption
   - Rate-limit redemption attempts per user/IP via KV
3. CTF events
   - Event board (upcoming/live/past), team registration per event with roster
   - Private team "war room" per event: challenge tracker (claim, solving, solved), notes, links
4. Writeups & walkthroughs
   - Markdown editor with preview, syntax highlighting, image upload to R2, "terminal" output blocks
   - Tags: category, difficulty, event, team; series support
   - Spoiler lock: writeups tied to a live event stay hidden until the event end time
   - Upvotes, bookmarks, threaded comments
5. Profiles & gamification
   - Hacker "dossier" profile: skill radar chart, badges, writeups, teams
   - XP + ranks, badges, seasonal leaderboards (teams and individuals)
6. Command palette (Ctrl+K) styled as a terminal: `cd`, `ls`, `whoami`, `join <code>`, `search <term>`
7. Hidden easter-egg flags across the site that award badges

## Security (non-negotiable — this audience will try to break it)
- Sanitize all markdown/HTML (DOMPurify or rehype-sanitize); strict CSP headers
- Server-side authorization on every team/writeup action; never trust client role checks
- Zod validation on all inputs; parameterized queries only
- Rate limiting on auth, invites, comments, uploads
- Validate upload MIME type + size; serve user files from a separate R2 domain
- Audit log for team admin actions
- Consider a responsible disclosure page + security.txt

## Visual design
Dark, futuristic sci-fi hacker aesthetic:
- Palette: near-black #05070a background, neon green #00ff9c, cyan #00e5ff, magenta #ff2bd6 accents
- Fonts: JetBrains Mono / Space Grotesk; monospace headings with blinking cursor
- Effects: CRT scanlines, subtle glitch on hover, hex/matrix rain canvas background, glassmorphism panels with neon borders, typing-text intros
- Respect `prefers-reduced-motion` and provide a "low-FX" toggle; keep it readable and accessible

## Higgsfield assets (use the Higgsfield MCP tools)
Generate and save to /public/assets, keeping a manifest (assets.json) with the prompt used for each:
1. Landing hero: a 3D holographic "network core" — glowing wireframe sphere with orbiting data nodes, neon cyan/green on black (generate_3d → GLB)
2. 3D rank badges for each rank tier (generate_3d), plus 2D renders as fallbacks (generate_image)
3. Looping 5–8s background videos: dark sci-fi server corridor, digital rain over a city skyline (generate_video), compressed to webm
4. Cyberpunk illustrations for empty states and 404 page (generate_image)
5. A default team emblem set (generate_image)
Before generating, check my Higgsfield balance and show me the planned asset list with estimated credits. Optimize GLBs (gltf-transform, Draco) and lazy-load all 3D.

## Phases
1. Scaffold, design system, layout, landing page with 3D hero
2. Auth + DB schema (users, teams, members, invites, events, writeups, comments, votes, badges)
3. Teams + invite codes + join requests
4. Events + war room
5. Writeups (editor, spoiler lock, voting, comments)
6. Profiles, XP, badges, leaderboards, command palette, easter eggs
7. Security hardening pass, tests, deploy to Cloudflare

Start with Phase 1. First show me the folder structure and DB schema plan, then build.
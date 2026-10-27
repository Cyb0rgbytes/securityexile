# Stage 1 runbook: foundations

Build Plan stage 1 tasks that need your hands rather than code: dashboards, servers, accounts.
Each section maps to a tracker task id. Tick it in the tracker once it's done.

| Task | Owner | Status |
| --- | --- | --- |
| p1-01 DNS for securityexile.com, ctf., labs. | you (dashboard) | holding pages built in code; DNS steps below |
| p1-02 Network separation plan | you | plan below; adopt before buying servers |
| p1-03 Small VPS for CTFd | you | sizing below |
| p1-04 Landing page (EN/AR) | code | built: `/`, `/ar` |
| p1-05 Branding | you + code | logo and colours done; social banners still open |
| p1-06 Terms + AUP | code + your legal review | draft live at `/terms`, `/ar/terms` |
| p1-07 Privacy policy | code + your legal review | draft live at `/privacy`, `/ar/privacy` |
| p1-08 Off-host backups + restore test | code + your setup | nightly workflow and drill built; one-time setup below |
| p1-09 Logs to a SIEM | you | steps below |
| p1-10 Private repo for config + challenges | you | layout below |

---

## p1-01 DNS and DNSSEC
1. Cloudflare → `securityexile.com` → **DNS → Settings → DNSSEC → Enable**. Copy the DS record Cloudflare shows into your registrar. If the registrar is Cloudflare Registrar, this happens automatically. Wait until Cloudflare shows *Active*.
2. Workers → `securityexile` → Domains & Routes → add custom domains `ctf.securityexile.com` and `labs.securityexile.com`. They show the holding pages served by this Worker.
3. Check:
   - `curl -sI https://ctf.securityexile.com/` → `200`;
   - `dig +dnssec securityexile.com` shows `ad` / RRSIG records (or use dnsviz.net).
4. While you're there, add **CAA** records allowing only the CAs you use (Cloudflare issues via Let's Encrypt / Google Trust Services), and keep the zone's **SSL mode** on *Full (strict)*.

## p1-02 Network separation (decide before buying anything)
Four trust zones. No zone reaches into another except along the arrows.

```
            Internet
   ┌───────────┼──────────────┬───────────────┐
   ▼           ▼              ▼               ▼
[Cloudflare] [CTF VPS]     [Labs account]  [Ops VPS]
 Workers:     CTFd +         isolated VLAN/   Hermes ops agent,
 apex, app.,  challenge      cloud account,   n8n. Admin access
 files.       containers     egress DENIED    via Tailscale/WireGuard only
                ▲                 ▲               │
                └── deploys only ─┴───────────────┘
   [Home lab / CSECNIX]: never connected to any of the above
```
- Separate cloud accounts (or at least projects) for CTF, labs and ops. Separate SSH keys per zone. No shared passwords.
- Labs: deny all egress by default; no route to the CTF VPS, the ops VPS or the internet (stage 4).
- The ops agent can reach the CTF and labs management APIs, but **never reads public content** (stage 5).
- The home lab and CSECNIX systems are never on any of these networks.

## p1-03 CTFd VPS sizing
- Start: **2 vCPU / 4 GB RAM / 40–80 GB SSD**, Ubuntu LTS, in a region near the UAE (Bahrain, Frankfurt or Mumbai). That covers CTFd + MariaDB + Redis for a few hundred players.
- Challenge containers that need per-team instances go on a **second** host later (stage 3). Don't co-host them with CTFd.
- Harden on day one: SSH keys only, no root login, `ufw` allowing 22 (from your IP or VPN) plus 80/443 only, unattended upgrades, fail2ban.

## p1-08 Backups (a backup you've never restored doesn't count)

**This app** is backed up nightly by `.github/workflows/backup.yml`, which runs at 02:17 UTC:
- `scripts/backup.mjs` exports the D1 schema and data, and copies every R2 upload.
- It writes a `manifest.json` with SHA-256 hashes and a row count for every table.
- `age` encrypts the result to your public key, and it's kept as a GitHub Actions artifact for
  90 days.

That keeps a copy outside Cloudflare. D1 Time Travel (30 days) also still covers point-in-time
restores inside Cloudflare.

The repo is public, so anyone signed in to GitHub can download the artifacts. The encryption is
what protects them: only your offline key can open them.

### One-time setup (you)
1. **Install age and make your key.** Keep the private key off GitHub:
   ```powershell
   winget install FiloSottile.age
   age-keygen -o security-exile-backup.key
   ```
   The command prints `Public key: age1…`. Put the whole `.key` file in your password manager,
   then delete it from disk. **Without it, every backup is unreadable.**
2. **GitHub → repo → Settings → Secrets and variables → Actions:**
   - **Variable** `BACKUP_AGE_RECIPIENT` = the `age1…` public key.
   - **Secret** `CLOUDFLARE_ACCOUNT_ID` = your account ID (Workers & Pages overview).
   - **Secret** `BACKUP_CLOUDFLARE_API_TOKEN`: an account API token with D1 access and nothing
     else. Try **D1: Read** first. If the export fails with a permission error, switch it to
     **D1: Edit**.
   - **Secrets** `BACKUP_R2_ACCESS_KEY_ID`, `BACKUP_R2_SECRET_ACCESS_KEY`: R2 → Manage API tokens
     → create a token with **Object Read only**, scoped to `security-exile-uploads`.
   - **Secret** `BACKUP_R2_ENDPOINT`: the bucket's S3 API URL from its R2 settings, such as
     `https://<account-id>.r2.cloudflarestorage.com`. Use the `.eu.` form if the bucket is in the
     EU jurisdiction.
3. **Actions → Backup → Run workflow** once. Check that an artifact named
   `securityexile-YYYY-MM-DD` appears.

If the R2 secrets are missing, the backup still runs with D1 only, and its manifest records
`"r2": null`.

### Monthly restore drill (you, about 5 minutes)
```powershell
gh run download --repo Cyb0rgbytes/securityexile --name securityexile-YYYY-MM-DD --dir backup-drill
# save your key from the password manager as a temporary file, then:
node scripts/restore-drill.mjs backup-drill\securityexile-YYYY-MM-DD.tar.gz.age --key security-exile-backup.key
Remove-Item -Recurse backup-drill, security-exile-backup.key
```
The drill checks the hashes, loads the backup into a throwaway local D1 (never your dev or
production database) and compares every table's rows and the R2 object count with the manifest.
`RESTORE DRILL PASSED` means it worked. Note the date on p1-08.

**A real restore** into production is the same files in the same order, run with `--remote`
after your explicit go-ahead:
```powershell
npx wrangler d1 execute DB --remote --file schema.sql
npx wrangler d1 execute DB --remote --file data.sql
```
Do it into a new, empty database first if you can.

**CTFd** (once deployed): run `mysqldump` nightly and back up the uploads volume, encrypted with
`restic`, to an off-host bucket. Keep 7 daily, 4 weekly and 6 monthly copies. Test-restore it
into a throwaway VM and log in.

## p1-09 SIEM
- Run Wazuh (manager on the ops VPS, or Wazuh Cloud) with agents on the CTF VPS and later the labs hosts.
- Sources:
  - VPS `auth.log` and sudo;
  - Docker events;
  - CTFd admin and audit logs;
  - Cloudflare (Logpush or Workers Logs for `securityexile`; firewall events);
  - this app's `audit_log` table (export via scheduled query).
- Alerts:
  - admin logins;
  - more than 20 failed logins in 5 minutes from one IP or account;
  - config or role changes (`platform_role` / `is_organizer` updates in D1);
  - new SSH keys;
  - sustained CPU over 90% on lab hosts (mining).

## p1-10 Private repo for platform config and challenges
New private repo `securityexile-ctf` (separate from this app):
```
infra/            docker-compose.yml, reverse proxy, CTFd config (no secrets; use .env.example)
challenges/
  web/<slug>/     challenge.yml (name, category, points, flag format SE{...}, author, ar/en text)
                  src/  Dockerfile  solution/README.md  solution/solve.py
  crypto/ forensics/ rev/ osint/ misc/ blue/
docs/             rules, playtest checklist, event runbooks
```
- Flags live only in `challenge.yml` in this private repo, never in public writeups before the event ends.
- Require a PR review (someone who didn't write it) before a challenge merges. That's your playtest gate (p2-10).

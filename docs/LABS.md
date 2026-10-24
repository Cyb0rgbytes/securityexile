# Labs (Build Plan stage 4)

Research notes and the chosen approach for hands-on labs — per-user vulnerable machines, as
distinct from the jeopardy CTF in stage 2 (that one is settled: self-hosted CTFd or GZ::CTF).

Researched 2026-10-25. Links were live then; re-check maturity before committing to anything.

## The headline

**There is no open-source HackTheBox you can deploy and point paying users at.** The ecosystem
splits in two: mature tools for building ranges *you* operate, and academic platforms that assume
an OpenStack team. Every "open-source HTB clone" is abandoned — see the dead list below.

So the control plane is custom work regardless of which tools we adopt. Plan for that rather than
hunting for a platform that doesn't exist.

## The plan: Vulhub → GOAD → Ludus

Grow the stack in three steps, so each is cheap until the one before it is proven, and only the
last takes on real orchestration cost.

### 1. Vulhub — container labs
[github.com/vulhub/vulhub](https://github.com/vulhub/vulhub) · MIT · ~21k stars · active

Pre-built vulnerable services on docker-compose, run under **gVisor** or **Kata**. Seconds to spin
up, cents to run, and realistically 70–80% of beginner-to-intermediate content. MIT means we can
redistribute commercially. OWASP Juice Shop (MIT) and DVWA (GPL-3.0) fit the same slot.

### 2. GOAD — the Windows/AD track
[github.com/Orange-Cyberdefense/GOAD](https://github.com/Orange-Cyberdefense/GOAD) · GPL-3.0 · active

Vulnerable multi-domain Active Directory. Runs on several providers before we ever need Ludus, and
has a first-class Ludus provider for when we do. **Read the Windows licensing note below before
building content around this** — the constraint lands here, not at step 3.

### 3. Ludus — orchestration at scale
[gitlab.com/badsectorlabs/ludus](https://gitlab.com/badsectorlabs/ludus) · [docs](https://docs.ludus.cloud/) · AGPL-3.0 · active

Proxmox-based range builder: a YAML range definition becomes Packer templates plus Ansible roles.
Already multi-user — per-user range, /16 slice, Proxmox pool and WireGuard config, roughly 150
users per host. Needs bare metal with nested virt (Debian 12/13 or Proxmox 8/9). The API and CLI
are open; the web UI is a paid Pro plugin, and [ludus-ux](https://github.com/ryokubaka/ludus-ux) is
a free community alternative.

**Important:** a Ludus "user" can deploy arbitrary Ansible. That is an *operator* account, not a
customer account. Front it with our own service account and never hand out Ludus logins.

## Three constraints, and when each bites

### Egress abuse — from step 1, and it's the biggest risk
The real danger is not a user escaping a box; it's a user pivoting out of one to scan, run C2, spam
or mine. That produces abuse reports against our IP range, and Hetzner/OVH-class providers suspend
first and ask later — a total outage plus a blacklisted IP block, for a solo owner.

The labs network must be **default-deny outbound from day one**. No internet from targets; bake
package needs into templates or serve them from a local allowlisted proxy. Block the cloud metadata
endpoint (169.254.169.254). WireGuard is the only path in, with per-peer rate limits and alerting on
outbound attempts. **Check the provider's AUP in writing before building** — some forbid
security-lab workloads outright.

### Windows licensing — at step 2, not step 3
Windows Server evaluation ISOs are licensed for evaluation, testing and training, and explicitly
**not for commercial use**. Running GOAD-style AD labs for paying members on eval media is a licence
breach. Legitimate routes are SPLA/hoster licensing, or Visual Studio/Azure dev-test subscriptions
(which themselves bar third-party use). The pragmatic option is to launch Linux-only and treat AD as
a later, separately funded track.

### Bare metal, not cloud — at step 3
Nested virt plus per-GB cloud pricing kills the model. A Hetzner AX41-NVMe (Ryzen 5 3600, 64 GB) is
about €42/month; AX102 about €129. One AX-class box with hard quotas is a viable launch.

## Isolation

| Workload | Runtime |
| --- | --- |
| Targets users get **root** on | **KVM** (Proxmox/QEMU). Own kernel, hardware boundary; guest root is expected and contained. |
| Container-authored targets needing VM-grade isolation | **Kata Containers** — OCI-shaped, each pod in a KVM guest. |
| Web-app labs, medium threat | **gVisor** — narrowed syscall surface, 20–50% overhead. Not for "exploit this kernel". |

**Firecracker is the wrong tool here.** Linux-only, direct kernel boot, minimal device model: it
cannot run Windows and cannot boot arbitrary VulnHub OVAs. Fine for an ephemeral attacker shell,
useless as a generic target runtime.

Regardless of runtime: assume every target is hostile. No host credentials or cloud metadata
reachable from lab networks, nested virt disabled in targets, per-user VLAN/VNet with default-deny
between users, no shared storage mounts, snapshot-revert rather than repair.

Note that Proxmox pools and ACLs are designed for delegation *inside one organisation*, not for
untrusted customers. The trust boundary must be the VPN edge and the network — never the Proxmox
web UI.

## Per-user networking

Ludus already does this: per-user WireGuard peer, per-user bridge, routing into only that user's
subnets. If we build it ourselves, plain `wg` with one peer per user plus per-peer `AllowedIPs` and
nftables rules keyed on the peer IP is genuinely sufficient and the easiest to reason about.
Control planes worth knowing: [NetBird](https://netbird.io/) (best REST API for peer provisioning),
[Headscale](https://github.com/juanfont/headscale), [Firezone](https://www.firezone.dev/). There is
no off-the-shelf "lab VPN broker" worth adopting.

## Keeping costs survivable

Layer by cost: container labs (shared, always-on, pennies) → single-VM boxes (on-demand, linked
clones) → multi-VM AD ranges (queue and hard cap on concurrent instances).

Non-negotiables: per-user VM/RAM quota; a TTL on every instance with an explicit extend; an idle
reaper keyed on VPN traffic; linked clones on thin storage so a clone costs seconds; revert to
snapshot instead of rebuilding; shared read-only targets wherever a lab has no per-user state
(most web labs qualify). HackTheBox's own writeup of a release accumulating ~2,400 VMs and degrading
shared infrastructure is the failure mode to design against.

## Content licensing

- **Vulhub** (MIT), **Juice Shop** (MIT), **DVWA** (GPL-3.0) — reusable, including commercially.
- **GOAD** (GPL-3.0) — the automation is reusable; the Windows guests it builds are not.
- **VulnHub** — submission terms grant everyone a permanent, free right to use, copy, amend and
  share, which does cover commercial reuse. Two caveats: a submitter can only grant rights to what
  they own (bundled Windows, Oracle or commercial appliances inside an image are not covered), and
  every OVA is an unvetted third-party disk image. Treat each as potentially backdoored: import only
  into a quarantined network, never on the management plane.
- **Kasm Workspaces Community Edition** is **not** an option — free tier is non-commercial and
  capped at 5 concurrent sessions. Use [Apache Guacamole](https://guacamole.apache.org/) (Apache-2.0)
  for browser access instead.

## Dead — do not plan around these

| Project | Status |
| --- | --- |
| DetectionLab | Officially sunset 2023-01-01 |
| Boxer ("open-source HackTheBox") | Last push 2022, author lacks time |
| Hackbox | Abandoned, 2020-era |
| secdevops-cuse/CyberRange | Last push 2020, **and no licence at all** |
| KYPO | EOL; successor is CyberRangeCZ |

**CyberRangeCZ Platform** ([github.com/cyberrangecz](https://github.com/cyberrangecz), MIT, active)
is the only genuinely multi-tenant OSS platform, but it needs a full OpenStack via Kolla-Ansible,
is documented as tested only to OpenStack Yoga, and has almost no community. For a solo owner that
is a trap, not a shortcut.

Maintained, but single-operator teaching tools rather than platforms:
[Kathará](https://github.com/KatharaFramework/Kathara), Labtainers,
[stratocyberlab](https://github.com/stratosphereips/stratocyberlab), EDURange3 (which has **no
licence file**, so it is unusable commercially as-is).

[Open Cyber Range](https://opencyberrange.com/) pitches exactly the per-student model we want, but
the repo was created in September 2026 with a non-standard licence. Too new to build a paid product
on; worth re-checking in 6–12 months.

## What stays custom whatever we adopt

1. **The customer-facing control plane** — entitlement check, provision request, instance lifecycle
   (spawn, extend, reset, kill), queueing and quotas.
2. **The trust boundary** — the Workers app holds identity; the labs host exposes only a narrow,
   authenticated internal API. Never Proxmox or Ludus directly to users.
3. **Per-user VPN issuance and revocation** tied to subscription state, plus the firewall rules
   restricting each peer to its own targets.
4. **Flag verification** — per-user flag injection at provision time and a submission endpoint.
   Neither CTFd nor GZ::CTF covers VM labs.
5. **Reaping, metering and abuse monitoring** — TTLs, idle detection, per-user cost accounting,
   egress alerting.

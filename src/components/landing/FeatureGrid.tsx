import { CursorHeading } from "@/components/fx/CursorHeading";
import { GlassPanel } from "@/components/ui/GlassPanel";

const FEATURES = [
  {
    cmd: "team --create",
    title: "Teams",
    body: "Captains, co-captains, reserves. Open, invite-only, or closed rosters with join requests.",
    accent: "text-neon",
  },
  {
    cmd: "invite --private",
    title: "Invite codes",
    body: "Expiring, revocable TEAM-XXXX-XXXX codes. Hashed at rest, every redemption logged.",
    accent: "text-cyan",
  },
  {
    cmd: "warroom --live",
    title: "War room",
    body: "Per-event private board: claim challenges, track solves, share notes and links.",
    accent: "text-magenta",
  },
  {
    cmd: "writeup --spoiler-lock",
    title: "Writeups",
    body: "Markdown with terminal blocks and syntax highlighting. Hidden until the event ends.",
    accent: "text-neon",
  },
  {
    cmd: "whoami",
    title: "Dossier",
    body: "Skill radar, badges, ranks and seasonal leaderboards for players and teams.",
    accent: "text-cyan",
  },
  {
    cmd: "ctrl+k",
    title: "Terminal palette",
    body: "Navigate with cd, ls, search and join. Some commands aren't documented. Look around.",
    accent: "text-magenta",
  },
];

export function FeatureGrid() {
  return (
    <section aria-labelledby="features-heading" className="mx-auto mt-28 max-w-6xl px-4 sm:px-6">
      <div id="features-heading">
        <CursorHeading prompt="~/">features</CursorHeading>
      </div>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <GlassPanel
            as="li"
            key={f.title}
            className="group p-5 transition-[border-color,box-shadow] duration-300 hover:border-line-strong hover:shadow-[0_0_24px_rgb(0_229_255/0.12)]"
          >
            <p className={`font-mono text-xs ${f.accent}`}>
              <span aria-hidden="true">$ </span>
              {f.cmd}
            </p>
            <h3 className="mt-3 text-xl font-semibold text-fg">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">{f.body}</p>
          </GlassPanel>
        ))}
      </ul>
    </section>
  );
}

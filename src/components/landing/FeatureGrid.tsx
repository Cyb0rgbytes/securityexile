import { CursorHeading } from "@/components/fx/CursorHeading";

const FEATURES = [
  {
    glyph: ">_",
    title: "Writeups and walkthroughs",
    body: "Markdown with terminal output blocks and syntax highlighting. Group posts into series. Writeups tied to a live event stay hidden until it ends.",
  },
  {
    glyph: "◎",
    title: "Skill dossier",
    body: "A profile that shows what you can do: a skill radar, badges, rank, and everything you've published.",
  },
  {
    glyph: "⌘",
    title: "Study teams",
    body: "Form a team with people at your level or ahead of it. Captains, co-captains and reserves; open, invite-only or closed.",
  },
  {
    glyph: "⚑",
    title: "Practice events",
    body: "A board of upcoming CTFs. Register your team and get a private war room to claim challenges, track solves and share notes.",
  },
  {
    glyph: "#",
    title: "Invite codes",
    body: "Bring people in with codes that expire, cap their uses and can be revoked. Every redemption is logged.",
  },
  {
    glyph: "⌨",
    title: "Terminal palette",
    body: "Press Ctrl+K to navigate with cd, ls, search and join. A few commands aren't documented. Look around.",
  },
];

export function FeatureGrid() {
  return (
    <section aria-labelledby="features-heading" className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
      <div id="features-heading">
        <CursorHeading prompt="~/">what&apos;s inside</CursorHeading>
      </div>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <li key={f.title} className="glass bracketed p-5">
            <p aria-hidden="true" className="font-mono text-lg leading-none text-green">
              {f.glyph}
            </p>
            <h3 className="mt-4 text-lg font-semibold text-fg">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">{f.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

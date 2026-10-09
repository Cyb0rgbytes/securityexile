import Link from "next/link";
import { CursorHeading } from "@/components/fx/CursorHeading";

/** `mark` is a decorative kanji for the feature (meaning in the comment). */
const LEAD = {
  mark: "書", // writing
  title: "Writeups and walkthroughs",
  body: "Markdown with terminal output blocks and syntax highlighting. Group posts into series. Writeups tied to a live event stay hidden until it ends.",
};

const FEATURES = [
  {
    mark: "技", // skill
    title: "Skill dossier",
    body: "A profile that shows what you can do: a skill radar, badges, rank, and everything you've published.",
  },
  {
    mark: "組", // group
    title: "Study teams",
    body: "Form a team with people at your level or ahead of it. Captains, co-captains and reserves; open, invite-only or closed.",
  },
  {
    mark: "戦", // battle
    title: "Practice events",
    body: "A board of upcoming CTFs. Register your team and get a private war room to claim challenges, track solves and share notes.",
  },
  {
    mark: "鍵", // key
    title: "Invite codes",
    body: "Bring people in with codes that expire, cap their uses and can be revoked. Every redemption is logged.",
  },
  {
    mark: "令", // command
    title: "Terminal palette",
    body: "Press Ctrl+K to navigate with cd, ls, search and join. A few commands aren't documented. Look around.",
  },
];

export function FeatureGrid() {
  return (
    <section aria-labelledby="features-heading" className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
      <div id="features-heading">
        <CursorHeading prompt="~/">What&apos;s inside</CursorHeading>
      </div>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <li className="glass notch edge-hover relative overflow-hidden p-7 sm:col-span-2 lg:row-span-2 lg:p-9">
          <span
            aria-hidden="true"
            className="kanji pointer-events-none absolute -bottom-8 -right-4 select-none text-[12rem] text-fg/[0.05] lg:text-[16rem]"
          >
            {LEAD.mark}
          </span>
          <span aria-hidden="true" className="hanko h-12 text-2xl">
            {LEAD.mark}
          </span>
          <h3 className="mt-6 font-display text-2xl font-semibold tracking-tight text-fg lg:text-3xl">{LEAD.title}</h3>
          <p className="mt-3 max-w-md leading-relaxed text-fg-muted">{LEAD.body}</p>
          <Link
            href="/writeups"
            className="relative mt-8 inline-block font-display text-sm font-semibold text-green-bright underline decoration-green/40 underline-offset-4 hover:decoration-green-bright"
          >
            Open the library
          </Link>
        </li>

        {FEATURES.map((f) => (
          <li key={f.title} className="edge-hover flex gap-4 border border-line bg-bg-deep/60 p-5 backdrop-blur-sm">
            <span aria-hidden="true" className="kanji mt-0.5 text-2xl text-green">
              {f.mark}
            </span>
            <div>
              <h3 className="font-display text-lg font-semibold text-fg">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{f.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

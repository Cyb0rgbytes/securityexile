import Link from "next/link";
import { CursorHeading } from "@/components/fx/CursorHeading";
import type { Dict } from "@/lib/i18n";

/** Decorative kanji per feature, in dictionary order (lead first). */
const LEAD_MARK = "書"; // writing
const MARKS = [
  "技", // skill
  "組", // group
  "戦", // battle
  "鍵", // key
  "令", // command
];

export function FeatureGrid({ t }: { t: Dict }) {
  const { lead, items } = t.features;
  return (
    <section aria-labelledby="features-heading" className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
      <div id="features-heading">
        <CursorHeading prompt="~/">{t.features.heading}</CursorHeading>
      </div>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <li className="glass notch edge-hover relative overflow-hidden p-7 sm:col-span-2 lg:row-span-2 lg:p-9">
          <span
            aria-hidden="true"
            className="kanji pointer-events-none absolute -bottom-8 -end-4 select-none text-[12rem] text-fg/[0.05] lg:text-[16rem]"
          >
            {LEAD_MARK}
          </span>
          <span aria-hidden="true" className="hanko h-12 text-2xl">
            {LEAD_MARK}
          </span>
          <h3 className="mt-6 font-display text-2xl font-semibold tracking-tight text-fg lg:text-3xl">{lead.title}</h3>
          <p className="mt-3 max-w-md leading-relaxed text-fg-muted">{lead.body}</p>
          <Link
            href="/writeups"
            className="relative mt-8 inline-block font-display text-sm font-semibold text-green-bright underline decoration-green/40 underline-offset-4 hover:decoration-green-bright"
          >
            {lead.link}
          </Link>
        </li>

        {items.map((f, i) => (
          <li key={f.title} className="edge-hover flex gap-4 border border-line bg-bg-deep/60 p-5 backdrop-blur-sm">
            <span aria-hidden="true" className="kanji mt-0.5 text-2xl text-green">
              {MARKS[i]}
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

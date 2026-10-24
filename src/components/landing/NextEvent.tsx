import Link from "next/link";
import { Countdown } from "@/components/events/Countdown";
import { LocalTime } from "@/components/events/LocalTime";
import { getDb } from "@/lib/db/client";
import { requestNow } from "@/lib/events/clock";
import { listBoard } from "@/lib/events/queries";
import { eventPhase } from "@/lib/events/timing";
import type { Dict } from "@/lib/i18n";
import { DISCORD_INVITE_URL } from "@/lib/links";

/** The soonest live or upcoming public event, or a pointer to Discord when nothing is scheduled. */
export async function NextEvent({ t }: { t: Dict }) {
  const now = requestNow();
  // listBoard returns not-yet-ended events soonest first; hidden ones are excluded for the public.
  const next = (await listBoard(getDb(), { includeHidden: false, now })).find((r) => eventPhase(r.event, now) !== "past")?.event;
  const live = next ? eventPhase(next, now) === "live" : false;

  return (
    <section aria-labelledby="next-event-heading" className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="notch flex flex-wrap items-center gap-x-6 gap-y-3 border border-line-strong bg-bg-deep/80 px-5 py-4 backdrop-blur-sm [--se-notch:14px]">
        <h2 id="next-event-heading" className="font-mono text-xs uppercase tracking-[0.2em] text-green">
          {live ? (
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="live-dot inline-block h-2 w-2 rounded-full bg-red" />
              {t.nextEvent.live}
            </span>
          ) : (
            t.nextEvent.label
          )}
        </h2>
        {next ? (
          <>
            <p className="min-w-0 flex-1 text-fg">
              <Link href={`/events/${next.slug}`} className="font-display text-lg font-semibold hover:text-green-bright">
                {next.title}
              </Link>
              <span className="ms-3 text-sm text-fg-muted" dir="ltr">
                <LocalTime iso={(live ? next.endsAt : next.startsAt).toISOString()} />
              </span>
            </p>
            <span className="text-sm text-fg-muted">
              <Countdown targetIso={(live ? next.endsAt : next.startsAt).toISOString()} prefix={live ? t.nextEvent.endsIn : t.nextEvent.startsIn} />
            </span>
            <Link href={`/events/${next.slug}`} className="font-mono text-sm text-green-bright underline-offset-4 hover:underline">
              {t.nextEvent.view}
            </Link>
          </>
        ) : (
          <>
            <p className="min-w-0 flex-1 text-fg-muted">{t.nextEvent.none}</p>
            <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer" className="font-mono text-sm text-green-bright underline-offset-4 hover:underline">
              {t.nextEvent.noneCta}
            </a>
          </>
        )}
      </div>
    </section>
  );
}

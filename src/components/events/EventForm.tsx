"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import type { ActionState } from "@/app/teams/actions";
import { FormMessage, inputCls, labelCls, SubmitButton } from "@/components/teams/FormBits";

type Defaults = { title?: string; kind?: "ctf" | "community"; format?: string; url?: string; description?: string; startsAt?: string; endsAt?: string };

/** ISO instant → value for <input type="datetime-local"> in the browser's zone. */
function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

/** datetime-local value (browser zone) → ISO instant the server can trust. */
function toIso(local: string) {
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

const noop = () => () => {};

/**
 * Start / end pickers. Rendered only in the browser: local-time values depend on the
 * viewer's timezone, which the server doesn't know (it would render UTC and mismatch).
 */
function DateFields({ defaults, limited }: { defaults: Defaults; limited: boolean }) {
  const [start, setStart] = useState(() => toLocalInput(defaults.startsAt));
  const [end, setEnd] = useState(() => toLocalInput(defaults.endsAt));
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div>
        <label htmlFor="startsLocal" className={labelCls}>Starts (your local time)</label>
        <input id="startsLocal" type="datetime-local" required value={start} onChange={(e) => setStart(e.target.value)} disabled={limited} className={`${inputCls} mt-1`} />
        <input type="hidden" name="startsAt" value={limited ? (defaults.startsAt ?? "") : toIso(start)} />
      </div>
      <div>
        <label htmlFor="endsLocal" className={labelCls}>Ends (your local time)</label>
        <input id="endsLocal" type="datetime-local" required value={end} onChange={(e) => setEnd(e.target.value)} className={`${inputCls} mt-1`} />
        <input type="hidden" name="endsAt" value={toIso(end)} />
      </div>
    </div>
  );
}

export function EventForm({
  action,
  defaults = {},
  limited = false,
  submitLabel,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  defaults?: Defaults;
  /** event has started: only end time and link are editable */
  limited?: boolean;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const client = useSyncExternalStore(noop, () => true, () => false);
  const f = { ...defaults, ...state.fields };

  return (
    <form action={formAction} className="space-y-5">
      {limited && <p className="text-sm text-fg-muted">This event has started, so only the end time and link can change.</p>}
      <div>
        <label htmlFor="title" className={labelCls}>Title</label>
        <input id="title" name="title" required minLength={3} maxLength={80} defaultValue={f.title} disabled={limited} className={`${inputCls} mt-1`} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="kind" className={labelCls}>Kind</label>
          <select id="kind" name="kind" defaultValue={f.kind ?? "ctf"} disabled={limited} className={`${inputCls} mt-1`}>
            <option value="ctf">CTF (teams register, war room)</option>
            <option value="community">Community event (workshop, talk, study session)</option>
          </select>
        </div>
        <div>
          <label htmlFor="format" className={labelCls}>Format (optional)</label>
          <input id="format" name="format" maxLength={30} placeholder="jeopardy, attack-defense…" defaultValue={f.format} disabled={limited} className={`${inputCls} mt-1`} />
        </div>
      </div>
      {client ? <DateFields defaults={defaults} limited={limited} /> : <p className="text-sm text-fg-muted">Loading date pickers…</p>}
      <div>
        <label htmlFor="url" className={labelCls}>Link (optional)</label>
        <input id="url" name="url" type="url" maxLength={500} placeholder="https://" defaultValue={f.url} className={`${inputCls} mt-1`} />
      </div>
      <div>
        <label htmlFor="description" className={labelCls}>Description (optional)</label>
        <textarea id="description" name="description" rows={5} maxLength={2000} defaultValue={f.description} disabled={limited} className={`${inputCls} mt-1`} />
      </div>
      <FormMessage state={state} />
      <SubmitButton pending="saving…">{submitLabel}</SubmitButton>
    </form>
  );
}

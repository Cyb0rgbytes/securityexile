"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/app/teams/actions";
import { FormMessage, inputCls, SubmitButton } from "@/components/teams/FormBits";
import { deleteEvent, registerTeam, setEventHidden, setRoster, unregisterTeam } from "../actions";

export function RegisterButton({ slug }: { slug: string }) {
  const [state, action] = useActionState<ActionState, FormData>(() => registerTeam(slug), {});
  return (
    <form action={action} className="space-y-2">
      <SubmitButton pending="registering…">register my team</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function UnregisterForm({ slug, tag }: { slug: string; tag: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<ActionState, FormData>(unregisterTeam.bind(null, slug), {});
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="font-mono text-xs text-fg-muted hover:text-red-bright">
        withdraw team
      </button>
    );
  return (
    <form action={action} className="max-w-xs space-y-2 rounded border border-red/40 p-3">
      <p className="text-xs text-fg">
        Withdrawing deletes your war room for this event. Type <span className="font-mono">{tag}</span> to confirm.
      </p>
      <label htmlFor="confirm-unreg" className="sr-only">
        Team tag
      </label>
      <input id="confirm-unreg" name="confirm" autoComplete="off" className={inputCls} />
      <FormMessage state={state} />
      <SubmitButton variant="danger" className="!py-1 !text-xs" pending="…">
        withdraw
      </SubmitButton>
    </form>
  );
}

export function RosterForm({ slug, members, roster }: { slug: string; members: { userId: string; handle: string | null }[]; roster: string[] }) {
  const [state, action] = useActionState<ActionState, FormData>(setRoster.bind(null, slug), {});
  return (
    <form action={action} className="space-y-3">
      <fieldset>
        <legend className="text-sm text-fg-muted">Who&apos;s playing</legend>
        <div className="mt-2 grid gap-1 sm:grid-cols-2">
          {members.map((m) => (
            <label key={m.userId} className="flex items-center gap-2 font-mono text-sm">
              <input type="checkbox" name="roster" value={m.userId} defaultChecked={roster.includes(m.userId)} /> @{m.handle}
            </label>
          ))}
        </div>
      </fieldset>
      <FormMessage state={state} />
      <SubmitButton variant="ghost" pending="saving…">
        save roster
      </SubmitButton>
    </form>
  );
}

export function HideToggle({ slug, hidden }: { slug: string; hidden: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(() => setEventHidden(slug, !hidden), {});
  return (
    <form action={action} className="flex items-center gap-3">
      <SubmitButton variant={hidden ? "ghost" : "danger"} className="!py-1 !text-xs" pending="…">
        {hidden ? "restore event" : "hide event"}
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function DeleteEventForm({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<ActionState, FormData>(deleteEvent.bind(null, slug), {});
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="font-mono text-xs text-fg-muted hover:text-red-bright">
        delete event
      </button>
    );
  return (
    <form action={action} className="max-w-xs space-y-2 rounded border border-red/40 p-3">
      <p className="text-xs text-fg">
        Type <span className="font-mono">{slug}</span> to delete this event.
      </p>
      <label htmlFor="confirm-del" className="sr-only">
        Event slug
      </label>
      <input id="confirm-del" name="confirm" autoComplete="off" className={inputCls} />
      <FormMessage state={state} />
      <SubmitButton variant="danger" className="!py-1 !text-xs" pending="…">
        delete
      </SubmitButton>
    </form>
  );
}

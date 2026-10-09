"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/app/teams/actions";
import { FormMessage, inputCls, SubmitButton } from "@/components/teams/FormBits";
import { deleteWriteup, setPublished, setWriteupHidden } from "@/app/writeups/actions";

export function PublishToggle({ id, published }: { id: string; published: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(() => setPublished(id, !published), {});
  return (
    <form action={action} className="flex items-center gap-3">
      <SubmitButton variant={published ? "ghost" : "primary"} pending="…">{published ? "unpublish" : "publish"}</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function DeleteWriteup({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<ActionState, FormData>(deleteWriteup.bind(null, id), {});
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="font-mono text-xs text-fg-muted hover:text-red-bright">delete writeup</button>;
  return (
    <form action={action} className="max-w-xs space-y-2 rounded border border-red/40 p-3">
      <p className="text-xs text-fg">This deletes the writeup, its comments, votes and bookmarks. Type <span className="font-mono">delete</span> to confirm.</p>
      <label htmlFor="confirm-delete-writeup" className="sr-only">Confirm</label>
      <input id="confirm-delete-writeup" name="confirm" autoComplete="off" className={inputCls} />
      <FormMessage state={state} />
      <SubmitButton variant="danger" className="!py-1 !text-xs" pending="…">delete</SubmitButton>
    </form>
  );
}

export function HideWriteup({ id, hidden }: { id: string; hidden: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(() => setWriteupHidden(id, !hidden), {});
  return (
    <form action={action} className="flex items-center gap-3">
      <SubmitButton variant={hidden ? "ghost" : "danger"} className="!py-1 !text-xs" pending="…">{hidden ? "restore writeup" : "hide writeup"}</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

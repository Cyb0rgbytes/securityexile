"use client";

import { useActionState, useState } from "react";
import { cancelRequest, leaveTeam, requestToJoin, type ActionState } from "../actions";
import { FormMessage, inputCls, labelCls, SubmitButton } from "@/components/teams/FormBits";

export function RequestToJoin({ tag, pending }: { tag: string; pending: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(requestToJoin.bind(null, tag), {});
  if (pending || state.ok)
    return (
      <form action={cancelRequest.bind(null, tag)} className="space-y-3">
        <p className="font-mono text-sm text-green-bright">{state.ok ?? "Your request is pending."}</p>
        <SubmitButton variant="ghost" pending="cancelling…">
          cancel request
        </SubmitButton>
      </form>
    );
  return (
    <form action={action} className="space-y-3">
      <label htmlFor="message" className={labelCls}>
        Say hi <span className="text-fg-muted/70">(optional)</span>
      </label>
      <textarea id="message" name="message" rows={2} maxLength={280} className={`${inputCls} font-sans`} />
      <FormMessage state={state} />
      <SubmitButton pending="sending…">request to join</SubmitButton>
    </form>
  );
}

export function LeaveTeam({ tag, isCaptain, alone }: { tag: string; isCaptain: boolean; alone: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<ActionState, FormData>(leaveTeam.bind(null, tag), {});
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="font-mono text-xs text-fg-muted underline-offset-4 hover:text-red-bright hover:underline">
        {alone ? "disband team" : "leave team"}
      </button>
    );
  return (
    <form action={action} className="space-y-3 rounded border border-red/40 p-4">
      <p className="text-sm text-fg">
        {alone
          ? "You're the last member: leaving deletes the team, its codes and its history."
          : isCaptain
            ? "Captains have to hand over captaincy before leaving (Manage → Members)."
            : "You'll lose access to the team's private pages."}
      </p>
      <label htmlFor="confirm-leave" className={labelCls}>
        Type <span className="font-mono text-fg">{tag}</span> to confirm
      </label>
      <input id="confirm-leave" name="confirm" autoComplete="off" className={inputCls} />
      <FormMessage state={state} />
      <div className="flex gap-3">
        <SubmitButton variant="danger" pending="leaving…">
          {alone ? "disband" : "leave"}
        </SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className="font-mono text-sm text-fg-muted hover:text-fg">
          cancel
        </button>
      </div>
    </form>
  );
}

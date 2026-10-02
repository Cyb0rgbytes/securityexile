"use client";

import { useActionState } from "react";
import { redeemInvite, type ActionState } from "../teams/actions";
import { FormMessage, inputCls, SubmitButton } from "@/components/teams/FormBits";

export function JoinForm() {
  const [state, action] = useActionState<ActionState, FormData>(redeemInvite, {});
  return (
    <form action={action} className="glass bracketed w-full space-y-4 p-6">
      <label htmlFor="code" className="block text-sm text-fg-muted">
        Invite code
      </label>
      <input
        id="code"
        name="code"
        required
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        placeholder="TEAM-XXXX-XXXX"
        defaultValue={state.fields?.code}
        className={`${inputCls} text-center text-lg uppercase tracking-widest`}
      />
      <FormMessage state={state} />
      <SubmitButton pending="checking…" className="w-full">
        join team
      </SubmitButton>
    </form>
  );
}

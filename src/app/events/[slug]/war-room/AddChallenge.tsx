"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/teams/actions";
import { FormMessage, inputCls, SubmitButton } from "@/components/teams/FormBits";
import { FOCUS_CATEGORIES } from "@/lib/teams/validation";
import { addChallenge } from "./actions";

export function AddChallenge({ slug }: { slug: string }) {
  const [state, action] = useActionState<ActionState, FormData>(addChallenge.bind(null, slug), {});
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[1fr_9rem_6rem_auto] sm:items-end">
      <div>
        <label htmlFor="ch-name" className="text-xs text-fg-muted">
          Challenge
        </label>
        <input id="ch-name" name="name" required maxLength={60} defaultValue={state.fields?.name} className={inputCls} />
      </div>
      <div>
        <label htmlFor="ch-cat" className="text-xs text-fg-muted">
          Category
        </label>
        <select id="ch-cat" name="category" defaultValue="web" className={inputCls}>
          {FOCUS_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="ch-pts" className="text-xs text-fg-muted">
          Points
        </label>
        <input id="ch-pts" name="points" inputMode="numeric" pattern="[0-9]*" defaultValue={state.fields?.points} className={inputCls} />
      </div>
      <SubmitButton pending="adding…">add</SubmitButton>
      <div className="sm:col-span-4">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

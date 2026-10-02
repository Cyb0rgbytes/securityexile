"use client";

import { useActionState } from "react";
import { claimHandle, type ClaimHandleState } from "./actions";

export function HandleForm({ suggestion }: { suggestion?: string }) {
  const [state, action, pending] = useActionState<ClaimHandleState, FormData>(claimHandle, {});
  const errorId = "handle-error";

  return (
    <form action={action} className="glass bracketed w-full p-6">
      <label htmlFor="handle" className="block text-sm text-fg-muted">
        Your handle is your public name and profile URL. You can&apos;t change it later.
      </label>
      <div className="mt-4 flex items-center rounded border border-line-strong bg-bg-deep focus-within:border-green-bright">
        <span aria-hidden="true" className="pl-3 font-mono text-sm text-fg-muted">
          /u/
        </span>
        <input
          id="handle"
          name="handle"
          required
          minLength={3}
          maxLength={20}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          defaultValue={state.value ?? suggestion}
          aria-invalid={!!state.error}
          aria-describedby={state.error ? errorId : undefined}
          className="w-full bg-transparent px-1 py-2.5 font-mono text-fg outline-none"
        />
      </div>
      {state.error && (
        <p id={errorId} role="alert" className="mt-2 font-mono text-sm text-red-bright">
          {state.error}
        </p>
      )}
      <p className="mt-3 text-xs text-fg-muted">3–20 characters: lowercase letters, numbers, - and _.</p>
      <button
        type="submit"
        disabled={pending}
        className="mt-6 w-full rounded bg-green px-5 py-2.5 font-mono text-sm font-semibold text-bg-deep transition-colors hover:bg-green-bright disabled:opacity-60"
      >
        {pending ? "claiming…" : "claim handle"}
      </button>
    </form>
  );
}

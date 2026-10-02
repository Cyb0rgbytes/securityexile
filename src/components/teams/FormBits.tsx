"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export const inputCls =
  "w-full rounded border border-line-strong bg-bg-deep px-3 py-2 font-mono text-sm text-fg outline-none focus:border-green-bright";
export const labelCls = "block text-sm text-fg-muted";

export function SubmitButton({
  children,
  pending: pendingLabel,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  pending?: string;
  variant?: "primary" | "danger" | "ghost";
  className?: string;
}) {
  const { pending } = useFormStatus();
  const v = {
    primary: "bg-green text-bg-deep hover:bg-green-bright",
    danger: "bg-red text-fg hover:bg-red-bright",
    ghost: "border border-line-strong text-fg hover:border-green-bright hover:text-green-bright",
  }[variant];
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded px-4 py-2 font-mono text-sm font-semibold transition-colors disabled:opacity-60 ${v} ${className}`}
    >
      {pending ? (pendingLabel ?? "working…") : children}
    </button>
  );
}

/** Inline result line for useActionState forms. */
export function FormMessage({ state }: { state: { error?: string; ok?: string } }) {
  if (state.error)
    return (
      <p role="alert" className="font-mono text-sm text-red-bright">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p role="status" className="font-mono text-sm text-green-bright">
        {state.ok}
      </p>
    );
  return null;
}

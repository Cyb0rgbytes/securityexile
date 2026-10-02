import type { ReactNode } from "react";

/** Centered frame shared by sign-in, sign-up and onboarding. */
export function AuthShell({ command, children }: { command: string; children: ReactNode }) {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center px-4 pt-12 sm:px-6">
      <p className="mb-6 self-start font-mono text-sm text-green">
        <span aria-hidden="true">$ </span>
        {command}
      </p>
      {children}
    </section>
  );
}

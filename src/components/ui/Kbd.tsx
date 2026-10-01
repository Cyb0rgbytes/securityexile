import type { ReactNode } from "react";

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line-strong bg-bg-raised px-1.5 py-0.5 font-mono text-[0.7rem] text-fg-muted">
      {children}
    </kbd>
  );
}

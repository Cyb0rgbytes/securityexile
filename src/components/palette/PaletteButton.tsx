"use client";

import { Kbd } from "@/components/ui/Kbd";
import { PALETTE_EVENT } from "./CommandPalette";

/** The Ctrl+K hint in the header, which also opens the palette when clicked. */
export function PaletteButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(PALETTE_EVENT))}
      aria-keyshortcuts="Control+K Meta+K"
      className="hidden min-h-11 items-center gap-1 text-xs text-fg-muted transition-colors hover:text-green-bright lg:flex"
    >
      <span className="sr-only">{label}</span>
      {/* A key chord reads left to right in either language. */}
      <span dir="ltr" className="flex gap-1">
        <Kbd>Ctrl</Kbd>
        <Kbd>K</Kbd>
      </span>
    </button>
  );
}

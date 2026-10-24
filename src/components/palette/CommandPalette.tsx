"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { filterCommands, type Command } from "@/lib/palette/commands";

/** Dispatch on window to open the palette from anywhere (the header button does). */
export const PALETTE_EVENT = "se:palette";

/**
 * Ctrl/Cmd+K navigation. Built on <dialog>.showModal(), so the browser supplies the focus
 * trap, the inert background and Escape; we only add the list keys. Destinations only —
 * nothing here mutates data.
 */
export function CommandPalette() {
  const ref = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const router = useRouter();
  const listId = useId();
  const results = filterCommands(query);

  const open = useCallback(() => {
    setQuery("");
    setActive(0);
    if (!ref.current?.open) ref.current?.showModal();
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (ref.current?.open) ref.current.close();
        else open();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(PALETTE_EVENT, open);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(PALETTE_EVENT, open);
    };
  }, [open]);

  function run(command: Command) {
    ref.current?.close();
    if (command.external) window.open(command.href, "_blank", "noopener,noreferrer");
    else router.push(command.href);
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    if (results.length === 0) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(results[active]);
    }
  }

  return (
    <dialog
      ref={ref}
      aria-label="Command palette"
      className="palette m-0 mx-auto mt-[12vh] w-[min(34rem,calc(100vw-2rem))] rounded-lg border border-line-strong bg-bg-deep p-0 text-fg backdrop:bg-bg-deep/70 backdrop:backdrop-blur-sm"
      onClose={() => setQuery("")}
      // A click landing on the dialog itself is a click on the backdrop; the panel fills it.
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
    >
      <div className="border-b border-line p-3">
        <label htmlFor="palette-input" className="sr-only">
          Search for a page
        </label>
        <input
          id="palette-input"
          autoFocus
          autoComplete="off"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={results.length ? `${listId}-${active}` : undefined}
          placeholder="Jump to…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onListKeyDown}
          className="w-full bg-transparent font-mono text-sm text-fg outline-none placeholder:text-fg-muted"
        />
      </div>

      {results.length === 0 ? (
        <p className="p-4 text-sm text-fg-muted">No matches.</p>
      ) : (
        <ul id={listId} role="listbox" aria-label="Results" className="max-h-[50vh] overflow-y-auto p-1">
          {results.map((c, i) => (
            <li
              key={c.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => run(c)}
              className={`flex cursor-pointer items-center gap-3 rounded px-3 py-2 text-sm ${
                i === active ? "bg-bg-raised text-green-bright" : "text-fg"
              }`}
            >
              <span className="flex-1">{c.label}</span>
              <span className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-fg-muted">{c.group}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="border-t border-line px-3 py-2 font-mono text-[0.7rem] text-fg-muted">↑↓ move · ↵ open · esc close</p>
    </dialog>
  );
}

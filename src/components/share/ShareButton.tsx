"use client";

import { useState } from "react";

/** Native share sheet where the browser has one (mobile), otherwise copies the link. */
export function ShareButton({ title, text, path, className = "text-fg-muted hover:text-fg" }: { title: string; text?: string; path?: string; className?: string }) {
  const [done, setDone] = useState("");
  const share = async () => {
    const url = path ? new URL(path, location.origin).href : location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setDone("link copied");
    } catch {
      // Dismissed share sheet or blocked clipboard: nothing to report.
    }
  };
  return (
    <button type="button" onClick={share} className={`font-mono text-sm ${className}`}>
      {done || "share"}
    </button>
  );
}

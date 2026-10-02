"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** True while the user is typing or picking in a form field; refreshing then would be disruptive. */
const busy = () => {
  const el = document.activeElement;
  return el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || (el instanceof HTMLInputElement && el.type !== "checkbox");
};

/** Re-fetches the server-rendered board every `ms` while the tab is visible, idle, and the room is writable. */
export function AutoRefresh({ ms = 10_000, enabled }: { ms?: number; enabled: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible" && !busy()) router.refresh();
    }, ms);
    return () => clearInterval(id);
  }, [enabled, ms, router]);
  return null;
}

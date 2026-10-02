"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** Server renders UTC; after hydration the viewer sees their own timezone. */
export function LocalTime({ iso, mode = "datetime" }: { iso: string; mode?: "datetime" | "time" }) {
  const client = useSyncExternalStore(noop, () => true, () => false);
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions =
    mode === "time" ? { hour: "2-digit", minute: "2-digit" } : { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" };
  const text = client ? d.toLocaleString(undefined, opts) : `${d.toLocaleString("en-GB", { ...opts, timeZone: "UTC" })} UTC`;
  return <time dateTime={iso}>{text}</time>;
}

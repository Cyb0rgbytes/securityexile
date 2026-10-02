"use client";

import { useSyncExternalStore } from "react";
import { formatCountdown } from "@/lib/events/timing";

const subscribe = (cb: () => void) => {
  const id = setInterval(cb, 1000);
  return () => clearInterval(id);
};
const nowSec = () => Math.floor(Date.now() / 1000);

/** Ticking "02:14:09" until `targetIso`; renders nothing on the server. */
export function Countdown({ targetIso, prefix }: { targetIso: string; prefix: string }) {
  const sec = useSyncExternalStore(subscribe, nowSec, () => null);
  if (sec === null) return null;
  const ms = new Date(targetIso).getTime() - sec * 1000;
  if (ms <= 0) return null;
  return (
    <span className="font-mono tabular-nums">
      {prefix} {formatCountdown(ms)}
    </span>
  );
}

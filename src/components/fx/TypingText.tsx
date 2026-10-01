"use client";

import { useEffect, useState } from "react";
import { useFx } from "@/lib/fx/FxProvider";

interface Props {
  text: string;
  /** ms per character */
  speed?: number;
  delay?: number;
  className?: string;
}

/**
 * Types `text` out character by character. The full string is always in
 * the DOM for screen readers and crawlers; only the visible slice animates.
 */
export function TypingText({ text, speed = 38, delay = 250, className }: Props) {
  const { level } = useFx();
  const animate = level === "full";
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    if (!animate) return;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      i += 1;
      setTyped(i);
      if (i < text.length) timer = setTimeout(tick, speed);
    };
    timer = setTimeout(tick, delay);
    return () => clearTimeout(timer);
  }, [animate, text, speed, delay]);

  // Static (SSR, unresolved, low-FX): show everything.
  const count = animate ? typed : text.length;

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.slice(0, count)}
        <span className="invisible">{text.slice(count)}</span>
      </span>
    </span>
  );
}

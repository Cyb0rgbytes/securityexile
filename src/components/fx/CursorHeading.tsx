import type { ReactNode } from "react";

type Level = 1 | 2 | 3;

interface Props {
  level?: Level;
  children: ReactNode;
  /** Prefix shown before the heading, e.g. "~/" or "$". Decorative. */
  prompt?: string;
  className?: string;
}

const sizes: Record<Level, string> = {
  1: "text-3xl sm:text-5xl",
  2: "text-2xl sm:text-3xl",
  3: "text-lg sm:text-xl",
};

/** Monospace heading with a blinking terminal cursor. */
export function CursorHeading({ level = 2, children, prompt, className = "" }: Props) {
  const Tag = `h${level}` as const;
  return (
    <Tag className={`cursor-blink font-mono font-bold tracking-tight text-fg ${sizes[level]} ${className}`}>
      {prompt && (
        <span aria-hidden="true" className="mr-2 text-neon">
          {prompt}
        </span>
      )}
      {children}
    </Tag>
  );
}

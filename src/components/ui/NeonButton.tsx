import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "danger" | "ghost";

// Blade-cut corners + a steel glint on hover/focus (see .notch / .glint).
const base =
  "notch glint inline-flex items-center justify-center gap-2 px-5 py-2.5 font-display text-sm font-semibold tracking-wide transition-[background-color,color,box-shadow] duration-200 active:translate-y-px";

const variants: Record<Variant, string> = {
  primary: "bg-green text-bg-deep hover:bg-green-bright",
  danger: "bg-red text-fg hover:bg-red-bright",
  ghost:
    "bg-bg/40 text-fg shadow-[inset_0_0_0_1px_var(--se-line-strong)] hover:text-green-bright hover:shadow-[inset_0_0_0_1px_var(--se-green-bright)]",
};

interface Props {
  href: string;
  children: ReactNode;
  variant?: Variant;
  className?: string;
}

export function NeonButton({ href, children, variant = "primary", className = "" }: Props) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 font-mono text-sm font-semibold uppercase tracking-wider transition-[box-shadow,background-color,color] duration-200";

const variants: Record<Variant, string> = {
  primary:
    "bg-neon text-bg shadow-[0_0_0_1px_var(--se-neon)] hover:shadow-[0_0_22px_rgb(0_255_156/0.55)]",
  ghost:
    "border border-line-strong text-cyan hover:bg-cyan/10 hover:shadow-[0_0_18px_rgb(0_229_255/0.35)]",
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

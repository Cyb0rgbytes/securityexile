import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "danger" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded px-5 py-2.5 font-mono text-sm font-semibold transition-[box-shadow,background-color,color,border-color] duration-200";

const variants: Record<Variant, string> = {
  primary:
    "bg-green text-bg-deep hover:bg-green-bright hover:shadow-[0_0_24px_rgb(0_196_106/0.5)]",
  danger: "bg-red text-fg hover:bg-red-bright hover:shadow-[0_0_24px_rgb(232_25_44/0.5)]",
  ghost:
    "border border-line-strong text-fg hover:border-green-bright hover:text-green-bright hover:shadow-[0_0_18px_rgb(0_196_106/0.25)]",
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

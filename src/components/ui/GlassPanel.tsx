import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLElement> & {
  as?: "div" | "li" | "section" | "article" | "aside";
  glow?: boolean;
};

export function GlassPanel({ as: Tag = "div", glow = false, className = "", ...rest }: Props) {
  return <Tag className={`glass ${glow ? "neon-border" : ""} ${className}`} {...rest} />;
}

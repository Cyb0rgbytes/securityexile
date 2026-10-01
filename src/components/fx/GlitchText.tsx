interface Props {
  children: string;
  as?: "span" | "p" | "h1" | "h2" | "h3";
  /** Fire the red/green split once on page load (timed after the crest boot). */
  boot?: boolean;
  className?: string;
}

/** Text that splits into red/green channels on hover/focus (CSS only). */
export function GlitchText({ children, as: Tag = "span", boot = false, className = "" }: Props) {
  return (
    <Tag className={`glitch ${boot ? "glitch-boot" : ""} ${className}`} data-text={children}>
      {children}
    </Tag>
  );
}

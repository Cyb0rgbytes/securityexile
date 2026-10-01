interface Props {
  children: string;
  as?: "span" | "p" | "h1" | "h2" | "h3";
  className?: string;
}

/** Text that splits into cyan/magenta channels on hover or focus (CSS only). */
export function GlitchText({ children, as: Tag = "span", className = "" }: Props) {
  return (
    <Tag className={`glitch ${className}`} data-text={children}>
      {children}
    </Tag>
  );
}

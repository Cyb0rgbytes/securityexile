import { emblemFromKey, type Emblem } from "@/lib/teams/validation";

interface Props {
  /** teams.logo_key ("emblem:<slug>") or a slug */
  emblem: string | Emblem | null | undefined;
  size?: number;
  className?: string;
}

/** A team's emblem. Unknown keys fall back to the falcon, so there's never a broken image. */
export function EmblemBadge({ emblem, size = 48, className = "" }: Props) {
  const slug = emblemFromKey(emblem?.startsWith("emblem:") ? emblem : `emblem:${emblem ?? ""}`);
  const src = size <= 64 ? `/assets/emblems/${slug}-128.webp` : `/assets/emblems/${slug}.webp`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      className={`shrink-0 rounded-full ring-1 ring-line-strong ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

import type { CSSProperties } from "react";

const SRC = "/assets/brand/falcon-960.webp";
const SRC_SM = "/assets/brand/falcon-480.webp";

/**
 * The community crest with its boot-up sequence: a stepped scanline wipe
 * reveals the falcon while red/green channel slices flash, then it idles
 * with a breathing glow and a rare micro-glitch. All CSS; see .crest-* in
 * globals.css. Static in low-FX.
 */
export function FalconCrest({ className = "" }: { className?: string }) {
  return (
    <div className={`crest ${className}`} style={{ "--crest-src": `url(${SRC})` } as CSSProperties}>
      <div className="crest-glow" aria-hidden="true" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={SRC}
        srcSet={`${SRC_SM} 480w, ${SRC} 960w`}
        sizes="(min-width: 1024px) 520px, 72vw"
        alt="Security Exile crest: a falcon with a fingerprint in the colours of the UAE flag"
        width={960}
        height={890}
        className="crest-img"
      />
      <div className="crest-ch crest-ch-r" aria-hidden="true" />
      <div className="crest-ch crest-ch-g" aria-hidden="true" />
      <div className="crest-scan" aria-hidden="true" />
    </div>
  );
}

"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { useFx } from "@/lib/fx/FxProvider";

const BG = "/assets/bg/shinobi";

/**
 * Fixed, full-viewport backdrop behind the whole site: a rain-soaked rooftop
 * at night with a lone shinobi (art generated for the site), a slow drift,
 * and a sparse kanji/katakana rain on top when FX is "full". The landing page
 * lets the art breathe; every other route gets a heavier scrim so long-form
 * reading stays comfortable.
 */
export function ShinobiBackdrop() {
  const { level } = useFx();
  const isHome = usePathname() === "/";

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg-deep">
      <picture>
        {/* Tall phones get a crop centred on the silhouette. */}
        <source media="(max-aspect-ratio: 3/4)" type="image/avif" srcSet={`${BG}-portrait.avif`} />
        <source media="(max-aspect-ratio: 3/4)" type="image/webp" srcSet={`${BG}-portrait.webp`} />
        <source type="image/avif" srcSet={`${BG}-1280.avif 1280w, ${BG}-2048.avif 2048w`} sizes="100vw" />
        <img
          src={`${BG}-1280.webp`}
          srcSet={`${BG}-1280.webp 1280w, ${BG}-2048.webp 2048w`}
          sizes="100vw"
          alt=""
          width={2048}
          height={1152}
          fetchPriority="high"
          decoding="async"
          className="backdrop-img absolute inset-0 h-full w-full object-cover object-[66%_center]"
        />
      </picture>

      {level === "full" && <KanjiRain />}

      {/* Readability. Wide screens: dark on the copy side, open where the figure sits.
          Phones: the figure sits behind the copy, so darken evenly. */}
      <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,rgb(7_10_18/0.94)_0%,rgb(7_10_18/0.78)_38%,rgb(7_10_18/0.1)_66%,rgb(7_10_18/0.3)_100%)] sm:block" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(7_10_18/0.55)_0%,rgb(7_10_18/0.72)_55%,rgb(7_10_18/0.9)_100%)] sm:hidden" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(7_10_18/0.7)_0%,transparent_14%,transparent_62%,var(--se-bg)_100%)]" />
      <div
        className={`absolute inset-0 bg-bg/80 transition-opacity duration-700 ${isHome ? "opacity-0" : "opacity-100"}`}
      />
    </div>
  );
}

/* ---------- kanji rain ---------- */

const GLYPHS =
  "忍影刃侍道闇風月雨鍵符解暗号守攻侵跡アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフホマミムメモヤユヨラリルレロワン01";

const CELL = 22; // px between glyphs, both axes
const FRAME_MS = 70; // ~14 steps a second: unhurried, cheap
const SPAWN = 0.006; // chance an idle column starts a drop on a given step

const rainStyle: CSSProperties = {
  // Keep the rain off the copy column on wide screens.
  maskImage: "linear-gradient(90deg, transparent 0%, rgb(0 0 0 / 0.35) 35%, #000 60%)",
  WebkitMaskImage: "linear-gradient(90deg, transparent 0%, rgb(0 0 0 / 0.35) 35%, #000 60%)",
};

/** Sparse falling glyphs with fading trails. Pauses while the tab is hidden. */
function KanjiRain() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let drops: number[] = []; // per column: row of the head, or -1 when idle
    let raf = 0;
    let last = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `600 ${CELL - 6}px "Yu Mincho", "Hiragino Mincho ProN", "Noto Serif CJK JP", serif`;
      ctx.textAlign = "center";
      drops = Array.from({ length: Math.ceil(window.innerWidth / CELL) }, () =>
        Math.random() < 0.15 ? Math.floor(Math.random() * 20) : -1,
      );
    };

    const step = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Fade what's there toward transparent, leaving trails.
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgb(0 0 0 / 0.14)";
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";

      for (let c = 0; c < drops.length; c++) {
        if (drops[c] < 0) {
          if (Math.random() < SPAWN) drops[c] = 0;
          continue;
        }
        const y = drops[c] * CELL;
        const glyph = GLYPHS[(Math.random() * GLYPHS.length) | 0];
        // Head glyph bright, a vermilion one now and then.
        ctx.fillStyle = Math.random() < 0.04 ? "#ff6a52" : "#cfe9ff";
        ctx.fillText(glyph, c * CELL + CELL / 2, y);
        drops[c] = y > h ? -1 : drops[c] + 1;
      }
    };

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < FRAME_MS) return;
      last = t;
      step();
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(loop);
    };

    resize();
    raf = requestAnimationFrame(loop);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full opacity-25 mix-blend-screen" style={rainStyle} />;
}

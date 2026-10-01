"use client";

import { useEffect, useRef } from "react";
import { useFx } from "@/lib/fx/FxProvider";

const GLYPHS = "0123456789ABCDEF";
const FONT_PX = 14;
const FRAME_MS = 1000 / 24; // rain looks right at a low, steady rate and costs little

/** Full-viewport hex rain behind everything. Stops entirely in low-FX. */
export function MatrixRain() {
  const { level } = useFx();
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (level !== "full" || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let drops: number[] = [];
    let raf = 0;
    let last = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cols = Math.ceil(window.innerWidth / FONT_PX);
      drops = Array.from({ length: cols }, () => Math.random() * -50);
    };

    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < FRAME_MS) return;
      last = t;
      ctx.fillStyle = "rgba(5, 7, 10, 0.12)";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.font = `${FONT_PX}px ui-monospace, monospace`;
      for (let i = 0; i < drops.length; i++) {
        const y = drops[i] * FONT_PX;
        ctx.fillStyle = Math.random() > 0.975 ? "#00e5ff" : "#00ff9c";
        ctx.fillText(GLYPHS[(Math.random() * 16) | 0], i * FONT_PX, y);
        if (y > window.innerHeight && Math.random() > 0.975) drops[i] = 0;
        else drops[i] += 1;
      }
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(draw);
    };

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [level]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="fx-only pointer-events-none fixed inset-0 -z-10 h-full w-full opacity-[0.13]"
    />
  );
}

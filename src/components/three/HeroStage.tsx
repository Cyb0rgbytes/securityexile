"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useFx } from "@/lib/fx/FxProvider";

// three + postprocessing stay out of the initial bundle.
const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

function Poster() {
  return (
    // Plain <img>: static WebP shipped as-is, no image optimizer needed on Workers.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/assets/hero/core-poster.webp"
      srcSet="/assets/hero/core-poster-640.webp 640w, /assets/hero/core-poster.webp 1024w"
      sizes="(min-width: 1024px) 560px, 90vw"
      alt=""
      width={1024}
      height={1024}
      fetchPriority="high"
      className="h-full w-full object-contain"
    />
  );
}

/**
 * Poster first (fast paint, SSR-safe). The WebGL scene loads only when FX
 * is "full" and the stage is near the viewport, then fades in over it.
 */
export function HeroStage() {
  const { level } = useFx();
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [requested, setRequested] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      rootMargin: "200px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Latch: once requested, keep the scene mounted while scrolling; just pause it.
  // (State derived during render - React re-renders immediately, no effect needed.)
  if (level === "full" && inView && !requested) setRequested(true);

  const show3d = level === "full" && requested;

  return (
    <div
      ref={ref}
      // Radial feather hides the bloom pass's square edge and blends poster/canvas into the page.
      className="relative aspect-square w-full max-w-[560px] [mask-image:radial-gradient(circle_at_center,black_52%,transparent_71%)]"
    >
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${show3d && ready ? "opacity-0" : "opacity-100"}`}
      >
        <Poster />
      </div>
      {show3d && (
        <div
          className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
        >
          <HeroScene active={inView} onReady={() => setReady(true)} fallback={<Poster />} />
        </div>
      )}
    </div>
  );
}

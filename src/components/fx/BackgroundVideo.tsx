"use client";

import { useEffect, useRef, useState } from "react";
import { useFx } from "@/lib/fx/FxProvider";

const POSTER = "/assets/bg/bg-poster.webp";

/**
 * Fixed, full-viewport brand loop (holographic globe) behind the whole site.
 * Poster paints immediately; the video only mounts when FX is "full", fades
 * in once it can play, and pauses while the tab is hidden. <source media>
 * is ignored on <video>, so the size is chosen in JS at mount.
 */
export function BackgroundVideo() {
  const { level } = useFx();
  const ref = useRef<HTMLVideoElement>(null);
  const [size, setSize] = useState<"1080" | "720" | null>(null);
  const [playing, setPlaying] = useState(false);

  // Pick a rendition once per mount; window is only available on the client.
  if (level === "full" && size === null) {
    setSize(window.innerWidth >= 1024 ? "1080" : "720");
  }

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onVisibility = () => {
      if (document.hidden) v.pause();
      else v.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [size]);

  const showVideo = level === "full" && size !== null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg-deep">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={POSTER}
        alt=""
        width={1920}
        height={1080}
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover object-[65%_center] opacity-80"
      />
      {showVideo && (
        <video
          ref={ref}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={POSTER}
          onCanPlay={() => setPlaying(true)}
          className={`absolute inset-0 h-full w-full object-cover object-[65%_center] transition-opacity duration-1000 ${playing ? "opacity-80" : "opacity-0"}`}
        >
          <source src={`/assets/bg/bg-${size}.webm`} type="video/webm" />
          <source src={`/assets/bg/bg-${size}.mp4`} type="video/mp4" />
        </video>
      )}
      {/* Readability: heavy on the copy side, lighter where the crest sits. */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(5_7_10/0.92)_0%,rgb(5_7_10/0.62)_34%,rgb(5_7_10/0.12)_62%,rgb(5_7_10/0.4)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(5_7_10/0.8)_0%,transparent_16%,transparent_64%,var(--se-bg)_100%)]" />
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks";

export type ClipName = "battle" | "cards" | "crawl" | "daily" | "dash" | "map";

/**
 * Short muted gameplay loop (real Unity footage, public/media/gameplay) in a phone-shaped frame.
 * Downloads only when scrolled near and plays only while visible; with reduced motion it shows the
 * poster and plays on tap.
 */
export function GameplayClip({ name, label, className = "" }: { name: ClipName; label: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const v = ref.current;
    if (!v || reduced) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        if (e.isIntersecting) {
          if (v.preload !== "auto") v.preload = "auto";
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      },
      { rootMargin: "120px", threshold: 0.15 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <div className={`px-border relative overflow-hidden bg-bg-0 ${className}`} style={{ aspectRatio: "9 / 20" }}>
      <video
        ref={ref}
        className="block h-full w-full object-cover"
        poster={`/media/gameplay/${name}.jpg`}
        muted
        loop
        playsInline
        preload="none"
        controls={reduced}
        aria-label={label}
      >
        <source src={`/media/gameplay/${name}.mp4`} type="video/mp4" />
      </video>
    </div>
  );
}

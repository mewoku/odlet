"use client";

import { useEffect, useRef } from "react";
import { PALETTES, type PaletteName } from "@/lib/palettes";
import { AMBIENT_PIXEL, ambientBlobs, blobSpriteSize, renderBlobSprite, type AmbientBlob } from "./ambientSprite";

/**
 * Pixel ambient background (PLAN §2): 2–3 drifting radial blobs, ordered-dithered at low resolution
 * and point-upscaled, fixed behind the page.
 *
 * Each blob is dithered ONCE into its own small canvas (alpha = quantised falloff, so the browser's
 * normal alpha compositing gives the same colours as the old per-frame software blend). The drift is
 * pure CSS: `transform` keyframes with `steps()` timing on wrapper elements (globals.css,
 * .amb-drift-*). That runs on the compositor in every engine — no requestAnimationFrame loop, no
 * per-frame putImageData, nothing a throttled/background main thread or a browser quirk can stall.
 * `prefers-reduced-motion: reduce` turns the keyframes off in CSS (static, same look).
 */
export function AmbientBackground({ palette = "lab" }: { palette?: PaletteName }) {
  const refs = useRef<(HTMLCanvasElement | null)[]>([]);
  const blobs = ambientBlobs(PALETTES[palette]);

  useEffect(() => {
    let raf = 0;
    const paint = () => {
      const side = Math.max(16, Math.ceil(Math.max(window.innerWidth, window.innerHeight) / AMBIENT_PIXEL));
      blobs.forEach((b, i) => {
        const c = refs.current[i];
        if (c) renderBlobSprite(c, b, side);
      });
    };
    paint();
    let lastSide = Math.max(window.innerWidth, window.innerHeight);
    const onResize = () => {
      const s = Math.max(window.innerWidth, window.innerHeight);
      // Mobile URL-bar show/hide changes innerHeight by a few px; only repaint on real changes.
      if (Math.abs(s - lastSide) < 48) return;
      lastSide = s;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(paint);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
    // blobs derive from palette only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette]);

  return (
    <div aria-hidden="true" data-ambient={palette} className="amb-root pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {blobs.map((b: AmbientBlob, i) => (
        <div
          key={i}
          className={`amb-anchor amb-drift-x${i}`}
          style={{
            left: `${b.px * 100}%`,
            top: `${b.py * 100}%`,
            ["--amb-size" as string]: `${blobSpriteSize(b.radius) * 100}vmax`,
          }}
        >
          <div className={`amb-drift-y${i}`}>
            <canvas
              ref={(el) => {
                refs.current[i] = el;
              }}
              width={2}
              height={2}
              className="amb-sprite pixelated"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

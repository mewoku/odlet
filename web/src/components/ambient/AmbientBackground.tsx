"use client";

import { useEffect, useRef } from "react";
import { PALETTES, type PaletteName } from "@/lib/palettes";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { AMBIENT_FPS, AMBIENT_PIXEL, ambientBlobs, renderAmbient } from "./ambientField";

/**
 * Pixel ambient background (PLAN §2): 3 slowly drifting radial blobs, ordered-dithered at low
 * resolution and point-upscaled. The dither grid stays fixed to the screen while the blobs move
 * through it, so edges shimmer pixel by pixel — the look the Unity app uses too.
 *
 * One small canvas (viewport / 6) is repainted at 15 fps; hidden tabs skip frames. Static (one
 * frame) when reduced motion is requested.
 */
export function AmbientBackground({ palette = "lab" }: { palette?: PaletteName }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    const blobs = ambientBlobs(PALETTES[palette]);
    let image: ImageData | null = null;
    let raf = 0;
    let last = 0;
    // Start mid-orbit so the first frame is already composed, not all blobs at rest.
    const start = performance.now() - 7000;

    const resize = () => {
      const w = Math.max(16, Math.ceil(window.innerWidth / AMBIENT_PIXEL));
      const h = Math.max(16, Math.ceil(window.innerHeight / AMBIENT_PIXEL));
      if (image && image.width === w && image.height === h) return;
      canvas.width = w;
      canvas.height = h;
      image = ctx.createImageData(w, h);
    };
    const draw = (now: number) => {
      if (!image) return;
      renderAmbient(image, blobs, (now - start) / 1000);
      ctx.putImageData(image, 0, 0);
    };
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden || now - last < 1000 / AMBIENT_FPS) return;
      last = now;
      draw(now);
    };

    resize();
    draw(performance.now());
    const onResize = () => {
      resize();
      draw(performance.now());
    };
    window.addEventListener("resize", onResize);
    if (!reduced) raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [palette, reduced]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-ambient={palette}
      width={16}
      height={16}
      className="pixelated pointer-events-none fixed inset-0 -z-10 h-full w-full"
      style={{ background: "var(--bg-0)" }}
    />
  );
}

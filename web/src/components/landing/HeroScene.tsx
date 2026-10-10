"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { VoxelViewer } from "../figure/VoxelViewer";
import { rarityColor } from "../ui/Badge";
import { PixelScenery, groundColor, sceneryAccent } from "./PixelScenery";
import { usePrefersReducedMotion } from "@/lib/hooks";
import type { FigureRecord } from "@/lib/types";

const KIND = "forest" as const;
/** Ground strip height (px); figures walk on its top edge. */
const GROUND_PX = 56;
/** Yaw (radians) that turns a figure to face screen-right / screen-left in the stage's iso camera. */
const FACE_RIGHT = -Math.PI / 2 - 0.35;
const FACE_LEFT = Math.PI / 2 + 0.35;
/** Hop height (px) of a click-jump. */
const JUMP_PX = 72;
const SIZES_WIDE = [136, 160, 196, 160, 136];
const SIZES_PHONE = [100, 128, 100];

interface Runner {
  x: number; // px from the left edge of the strip (figure's left edge)
  dir: 1 | -1;
  speed: number; // px per second
  rest: number; // seconds left standing still
  step: number; // walk-cycle phase (radians)
  jump: number; // seconds into a click-jump, < 0 when grounded
}

/**
 * Hero diorama: a wide pixel forest; the figures run back and forth along the tree line, stop now and
 * then, turn around at the edges and hop when clicked. Phones get three figures, wider screens five.
 * With reduced motion they stand still in a row (the previous static scene).
 */
export function HeroScene({ figures }: { figures: FigureRecord[] }) {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const row = useMemo(() => {
    if (!figures.length) return [];
    const pick = (k: number) => figures[k % figures.length]!;
    return wide ? [pick(3), pick(1), pick(0), pick(2), pick(4)] : [pick(1), pick(0), pick(2)];
  }, [figures, wide]);
  if (!row.length) return null;
  const sizes = wide ? SIZES_WIDE : SIZES_PHONE;
  return (
    <div className="relative h-[280px] w-full overflow-hidden sm:h-[340px] md:h-[400px]">
      {/* Sky fades in from the page ambient instead of starting on a hard edge. */}
      <div
        className="absolute inset-x-0 top-0"
        style={{ bottom: GROUND_PX, maskImage: "linear-gradient(to bottom, transparent, #000 45%)", WebkitMaskImage: "linear-gradient(to bottom, transparent, #000 45%)" }}
      >
        <PixelScenery kind={KIND} wide ground={false} />
      </div>
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0" style={{ height: GROUND_PX, background: groundColor(KIND) }}>
        <div className="h-1 w-full opacity-70" style={{ background: sceneryAccent(KIND) }} />
        <div className="dither-bg h-full w-full" />
      </div>
      <Runners key={wide ? "wide" : "phone"} figures={row} sizes={sizes} />
      <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center font-label text-[12px] text-text/80">Tap a figure to make it jump</p>
    </div>
  );
}

function Runners({ figures, sizes }: { figures: FigureRecord[]; sizes: number[] }) {
  const reduced = usePrefersReducedMotion();
  const stripRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const runners = useRef<Runner[]>([]);
  // Facing only changes on a turn, so it is React state; positions are written straight to the DOM.
  const [facing, setFacing] = useState<(1 | -1)[]>(() => figures.map((_, i) => (i % 2 ? -1 : 1)));

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || reduced) return;
    const width = () => strip.clientWidth;
    // Start spread out evenly so the first frame looks like the old lineup.
    runners.current = figures.map((_, i) => ({
      x: ((i + 0.5) / figures.length) * width() - sizes[i]! / 2,
      dir: i % 2 ? -1 : 1,
      speed: 34 + ((i * 37) % 5) * 9,
      rest: 0.4 + i * 0.35,
      step: i,
      jump: -1,
    }));
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const w = width();
      let turned = false;
      runners.current.forEach((r, i) => {
        const size = sizes[i]!;
        const el = itemRefs.current[i];
        if (r.jump >= 0) r.jump += dt;
        if (r.jump > 0.6) r.jump = -1;
        if (r.rest > 0) {
          r.rest -= dt;
        } else {
          r.x += r.dir * r.speed * dt;
          r.step += dt * r.speed * 0.25;
          // Turn at the edges (half the figure may leave the strip), or now and then for no reason.
          const min = -size * 0.25;
          const max = w - size * 0.75;
          if ((r.x < min && r.dir < 0) || (r.x > max && r.dir > 0) || Math.random() < dt * 0.06) {
            r.x = Math.max(min, Math.min(max, r.x));
            r.dir = r.dir > 0 ? -1 : 1;
            r.rest = 0.3 + Math.random() * 0.9;
            turned = true;
          } else if (Math.random() < dt * 0.12) {
            r.rest = 0.6 + Math.random() * 1.4;
          }
        }
        if (!el) return;
        const walking = r.rest <= 0;
        const bob = walking ? Math.abs(Math.sin(r.step)) * Math.max(3, size * 0.035) : 0;
        const hop = r.jump >= 0 ? Math.sin((r.jump / 0.6) * Math.PI) * JUMP_PX : 0;
        el.style.transform = `translate3d(${r.x.toFixed(1)}px, ${(-bob - hop).toFixed(1)}px, 0)`;
      });
      if (turned) setFacing(runners.current.map((r) => r.dir));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [figures, sizes, reduced]);

  const jump = (i: number) => {
    const r = runners.current[i];
    if (r && r.jump < 0) r.jump = 0;
  };

  if (reduced) {
    return (
      <ul className="absolute inset-x-0 flex items-end justify-center gap-0 md:gap-4" style={{ bottom: GROUND_PX - 22 }}>
        {figures.map((f, i) => (
          <li key={`${f.id}-${i}`}>
            <VoxelViewer encoding={f.encoding} size={sizes[i]!} resolution={Math.round(sizes[i]! / 3)} rim={rarityColor(f.rarity)} phase={i * 1.3} label={`${f.name}, ${f.rarity} figure. Drag to spin.`} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    // Figures' feet sit ~10% above the canvas bottom (the floor shadow), so sink them a little.
    <ul ref={stripRef} className="absolute inset-x-0" style={{ bottom: GROUND_PX - 22, height: Math.max(...sizes) + JUMP_PX }}>
      {figures.map((f, i) => (
        <li
          key={`${f.id}-${i}`}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          className="absolute bottom-0 left-0 will-change-transform"
          style={{ transform: `translate3d(${(((i + 0.5) / figures.length) * 100).toFixed(1)}vw, 0, 0)`, zIndex: sizes[i] }}
        >
          <button type="button" onClick={() => jump(i)} className="block cursor-pointer" aria-label={`${f.name}, ${f.rarity} figure. Jump!`}>
            <VoxelViewer
              encoding={f.encoding}
              size={sizes[i]!}
              resolution={Math.round(sizes[i]! / 3)}
              rim={rarityColor(f.rarity)}
              interactive={false}
              yaw={facing[i]! > 0 ? FACE_RIGHT : FACE_LEFT}
              label={`${f.name}, ${f.rarity} figure`}
            />
          </button>
        </li>
      ))}
    </ul>
  );
}

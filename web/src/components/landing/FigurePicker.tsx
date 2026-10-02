"use client";

import { useCallback, useState } from "react";
import { VoxelViewer } from "../figure/VoxelViewer";
import { Badge, rarityColor } from "../ui/Badge";
import { PixelButton } from "../ui/PixelButton";
import { PixelScenery, SCENERY_NAME, sceneryFor } from "./PixelScenery";
import type { FigureRecord } from "@/lib/types";

const LORE = [
  "Solves the daily before breakfast. Never says how.",
  "Collects odd cubes. Claims each one hums a different note.",
  "Once rotated a whole board with one look.",
  "Walked out of the Lab with a shadow that was not theirs.",
  "Keeps score in chalk on the back of a boss door.",
  "Trains on mirror puzzles until the reflection blinks first.",
  "Swears the Link paths spell a name if you squint.",
  "Never lost a streak. Never mentions the one before that.",
  "Arrived on a ball that rolled off the arrow maze.",
  "Reads patterns in rain, crowds and chiptune drums.",
];

function loreFor(seed: string): string {
  let h = 7;
  for (let i = 0; i < seed.length; i++) h = (h * 33 + seed.charCodeAt(i)) >>> 0;
  return LORE[h % LORE.length]!;
}

/**
 * Character picker: the figure turns on its own pixel diorama (drag to spin), arrows step through the
 * roster, and the details sit beside it. Arrow keys work when the picker has focus.
 */
export function FigurePicker({ figures }: { figures: FigureRecord[] }) {
  const [i, setI] = useState(0);
  const step = useCallback((d: number) => setI((x) => (x + d + figures.length) % figures.length), [figures.length]);
  if (!figures.length) return null;
  const f = figures[i]!;
  // Demo seeds repeat across tiers, so key the scenery and story on the whole identity.
  const key = `${f.seed}:${f.tier}:${f.name}`;
  const kind = sceneryFor(key);
  const c = rarityColor(f.rarity);

  return (
    <div
      className="grid items-stretch gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]"
      role="group"
      aria-roledescription="carousel"
      aria-label="Figures"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "ArrowLeft") step(-1);
        if (e.key === "ArrowRight") step(1);
      }}
    >
      <div className="px-border relative h-[340px] overflow-hidden sm:h-[400px]" style={{ ["--pb" as string]: c }}>
        <div className="absolute inset-0">
          <PixelScenery kind={kind} />
        </div>
        <div className="absolute inset-x-0 flex justify-center" style={{ bottom: "8%" }}>
          <VoxelViewer key={f.id} encoding={f.encoding} size={224} resolution={72} rim={c} label={`${f.name}, ${f.rarity} figure. Drag to spin.`} />
        </div>
        <span className="absolute inset-x-0 bottom-2 text-center font-label text-[12px] text-text/85">{SCENERY_NAME[kind]}</span>
        <ArrowButton dir={-1} onClick={() => step(-1)} />
        <ArrowButton dir={1} onClick={() => step(1)} />
      </div>

      <div className="flex flex-col gap-4" aria-live="polite">
        <div className="flex items-center gap-3">
          <Badge rarity={f.rarity} />
          <span className="font-label text-[13px] text-muted">
            {f.tier}×{f.tier} figure
          </span>
        </div>
        <h3 className="text-[32px] leading-10 text-text md:text-[40px] md:leading-[48px]">{f.name}</h3>
        <p className="max-w-[420px] text-[18px] leading-7 text-muted">{loreFor(key)}</p>
        <dl className="grid max-w-[360px] grid-cols-[auto_1fr] gap-x-6 gap-y-2">
          <dt className="font-label text-[13px] text-muted">Rarity</dt>
          <dd className="text-[16px]" style={{ color: c }}>{f.rarity}</dd>
          <dt className="font-label text-[13px] text-muted">Build</dt>
          <dd className="text-[16px] text-text">{f.tier}×{f.tier} voxels, {f.tier * 2} tall</dd>
          <dt className="font-label text-[13px] text-muted">Home</dt>
          <dd className="text-[16px] text-text">{SCENERY_NAME[kind]}</dd>
        </dl>
        <div className="mt-auto flex flex-wrap items-center gap-4 pt-2">
          <PixelButton href="/market" palette="pattern">
            Collect figures
          </PixelButton>
          <span className="font-label text-[13px] text-muted tabular">
            {i + 1} / {figures.length}
          </span>
        </div>
        <ol className="flex flex-wrap gap-2" aria-label="Pick a figure">
          {figures.map((g, k) => (
            <li key={g.id}>
              <button
                type="button"
                aria-label={`Show ${g.name}`}
                aria-current={k === i ? "true" : undefined}
                onClick={() => setI(k)}
                className="block h-3 transition-[width]"
                style={{ width: k === i ? 24 : 12, background: k === i ? c : "var(--line)" }}
              />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function ArrowButton({ dir, onClick }: { dir: -1 | 1; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir < 0 ? "Previous figure" : "Next figure"}
      className={`px-border absolute top-1/2 grid size-12 -translate-y-1/2 place-items-center bg-bg-0/70 font-pixel text-[20px] text-text hover:bg-bg-0 hover:text-accent ${dir < 0 ? "left-3" : "right-3"}`}
    >
      {dir < 0 ? "<" : ">"}
    </button>
  );
}

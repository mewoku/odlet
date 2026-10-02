import { VoxelViewer } from "../figure/VoxelViewer";
import { rarityColor } from "../ui/Badge";
import { PixelScenery, groundColor, sceneryAccent } from "./PixelScenery";
import type { FigureRecord } from "@/lib/types";

const KIND = "forest" as const;
/** Ground strip height (px); figures stand on its top edge. */
const GROUND_PX = 56;

/**
 * Hero diorama: a wide pixel forest with figures lined up on the ground, the middle one biggest.
 * Every figure can be dragged to spin. Phones get three figures, wider screens five.
 */
export function HeroScene({ figures }: { figures: FigureRecord[] }) {
  if (!figures.length) return null;
  const pick = (k: number) => figures[k % figures.length]!;
  const wideRow = [pick(3), pick(1), pick(0), pick(2), pick(4)];
  const wideSizes = [148, 184, 232, 184, 148];
  const phoneRow = [pick(1), pick(0), pick(2)];
  const phoneSizes = [112, 156, 112];
  return (
    <div className="relative h-[280px] w-full sm:h-[340px] md:h-[400px]">
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
      <Row figures={phoneRow} sizes={phoneSizes} className="flex sm:hidden" />
      <Row figures={wideRow} sizes={wideSizes} className="hidden sm:flex" />
      <p className="absolute inset-x-0 bottom-3 text-center font-label text-[12px] text-text/80">Drag a figure to spin it</p>
    </div>
  );
}

function Row({ figures, sizes, className }: { figures: FigureRecord[]; sizes: number[]; className: string }) {
  return (
    // Figures' feet sit ~10% above the canvas bottom (the floor shadow), so sink them a little.
    <ul className={`absolute inset-x-0 items-end justify-center gap-0 md:gap-4 ${className}`} style={{ bottom: GROUND_PX - 22 }}>
      {figures.map((f, i) => (
        <li key={`${f.id}-${i}`} className="flex flex-col items-center">
          <VoxelViewer
            encoding={f.encoding}
            size={sizes[i]!}
            resolution={Math.round(sizes[i]! / 3)}
            rim={rarityColor(f.rarity)}
            phase={i * 1.3}
            label={`${f.name}, ${f.rarity} figure. Drag to spin.`}
          />
        </li>
      ))}
    </ul>
  );
}

import { VoxelViewer } from "@/components/figure/VoxelViewer";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { PixelPanel } from "@/components/ui/PixelPanel";
import { demoFigures } from "@/lib/demo/data";

/** Shown while the marketplace (trading + SOL purchases) is closed ahead of the mainnet launch. */
export function MarketComingSoon() {
  const showcase = demoFigures.slice(0, 3);
  return (
    <PixelPanel accent className="flex flex-col items-center gap-6 p-8 text-center">
      <p className="font-label text-[13px] text-yellow uppercase">Coming soon</p>
      <h2 className="text-[28px] leading-9 text-accent md:text-[36px] md:leading-[44px]">The figure market opens soon</h2>
      <p className="max-w-[560px] text-[15px] leading-6 text-muted">
        Trading voxel figures and buying them with SOL open with our launch. Until then, every figure is earned in the game:
        clear levels and Dailies for shards, then pick yours in the in-game shop.
      </p>
      <div className="flex flex-wrap items-end justify-center gap-4">
        {showcase.map((f) => (
          <VoxelViewer key={f.id} encoding={f.encoding} size={120} resolution={40} label={f.name} />
        ))}
      </div>
      <PixelButton href="/play" size="lg">
        <PixelIcon name="play" size={16} /> Play and earn shards
      </PixelButton>
    </PixelPanel>
  );
}

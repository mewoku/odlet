import { Fragment } from "react";
import Link from "next/link";
import { publicEnv } from "@/lib/env";
import { AmbientBackground } from "@/components/ambient/AmbientBackground";
import { HeroScene } from "@/components/landing/HeroScene";
import { FigurePicker } from "@/components/landing/FigurePicker";
import { LinkArt, PatternArt, SpatialArt } from "@/components/landing/TrialArt";
import { VoxelViewer } from "@/components/figure/VoxelViewer";
import { WorldMap } from "@/components/play/WorldMap";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelIcon, type IconName } from "@/components/ui/PixelIcon";
import { SectionTitle } from "@/components/ui/PixelPanel";
import { BuiltWith } from "@/components/landing/BuiltWith";
import { demoFigures, demoMonsters } from "@/lib/demo/data";
import { BOSS_ENTRY, EARN, formatSol } from "@/lib/economy";

const featured = demoFigures.filter((f) => f.rarity !== "Common").slice(0, 8);
const boss = demoMonsters.find((m) => m.tier === 5) ?? demoMonsters[0]!;

const TRIALS = [
  { palette: "pattern", name: "Pattern", verb: "Spot the rule", Art: PatternArt },
  { palette: "lab", name: "Spatial", verb: "Turn the board", Art: SpatialArt },
  { palette: "link", name: "Link", verb: "Draw one path", Art: LinkArt },
] as const;

const STEPS: { icon: IconName; title: string; body: string }[] = [
  { icon: "play", title: "Fight", body: "Five worlds, sixty puzzle battles, a boss at the end of each." },
  { icon: "bolt", title: "Daily run", body: "Three puzzles, same for everyone, once a day." },
  { icon: "shard", title: "Earn shards", body: `Up to +${EARN.bossWinMax} per boss win.` },
  { icon: "cube", title: "Collect", body: "Voxel figures. Equip one as your avatar." },
];

export default function LandingPage() {
  return (
    <div data-palette="lab" className="relative overflow-x-clip">
      <AmbientBackground palette="lab" />

      {/* ---------------- hero: big title, then the figures standing in a pixel forest ---------------- */}
      <section className="relative flex flex-col items-center pt-10 md:pt-16" aria-label="Odlet">
        <div className="px-rise flex flex-col items-center px-4 text-center">
          <p className="font-label text-[14px] text-yellow">Puzzle combat · Solana Seeker</p>
          <h1
            className="mt-3 text-[72px] leading-[72px] text-teal min-[400px]:text-[88px] min-[400px]:leading-[88px] md:text-[160px] md:leading-[160px]"
            style={{
              textShadow: "0 6px 0 #135b73, 0 12px 0 #0b3b4a, 0 0 48px rgb(17 197 179 / 0.45)",
            }}
          >
            ODLET
          </h1>
          <p className="mt-6 max-w-[520px] text-[20px] leading-8 text-text md:text-[22px]">Every card is a puzzle. Solve fast, hit hard.</p>
          <div className="mt-8 flex w-full flex-col items-stretch gap-4 min-[400px]:w-auto min-[400px]:flex-row min-[400px]:items-center">
            <PixelButton href="/play" size="lg">
              <PixelIcon name="play" size={16} /> Play free
            </PixelButton>
            <PixelButton href="#get-seeker" size="lg" variant="secondary" palette="frost">
              Get on Seeker
            </PixelButton>
          </div>
        </div>
        <div className="mt-10 w-full md:mt-12">
          <HeroScene figures={featured} />
        </div>
      </section>

      {/* ---------------- the daily: one run, three steps in order ---------------- */}
      <section className="mx-auto max-w-[1200px] px-4 py-12" aria-labelledby="trials-title">
        <SectionTitle kicker="The Daily" title="One run. Three steps." />
        <span id="trials-title" className="sr-only">Daily run</span>
        <ol className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
          {TRIALS.map(({ palette, name, verb, Art }, i) => (
            <Fragment key={name}>
              {i > 0 && (
                <li aria-hidden="true" className="grid place-items-center font-pixel text-[24px] text-muted">
                  <span className="rotate-90 md:rotate-0">&gt;</span>
                </li>
              )}
              <li data-palette={palette} className="h-full">
                <Link href="/play" className="group px-panel flex h-full items-center gap-4 p-4 hover:brightness-110 md:flex-col md:items-stretch" data-accent="true">
                  <div className="dither-bg px-border grid w-28 shrink-0 place-items-center p-3 md:w-auto md:p-4" style={{ background: "color-mix(in srgb, var(--ambient) 70%, #07080b)", ["--pb" as string]: "var(--accent-2)" }}>
                    <div className="w-full max-w-[180px]">
                      <Art />
                    </div>
                  </div>
                  <div>
                    <p className="font-label text-[13px] text-muted">Step {i + 1}</p>
                    <h3 className="text-[24px] leading-8 text-accent">{name}</h3>
                    <p className="text-[16px] leading-6 text-text">{verb}</p>
                  </div>
                </Link>
              </li>
            </Fragment>
          ))}
        </ol>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <PixelButton href="/play" palette="frost">
            <PixelIcon name="play" size={16} /> Play today&apos;s run
          </PixelButton>
          <span className="text-[16px] text-muted">Same puzzles for everyone. One go a day.</span>
        </div>
      </section>

      {/* ---------------- figures: pick-a-character carousel ---------------- */}
      <section className="mx-auto max-w-[1200px] px-4 py-12" aria-label="Figures">
        <SectionTitle kicker="Figures" title="Pick your fighter." />
        <FigurePicker figures={featured} />
      </section>

      {/* ---------------- adventure ---------------- */}
      <section className="mx-auto max-w-[1200px] px-4 py-12" aria-label="Adventure worlds">
        <SectionTitle kicker="Play · Adventure" title="Five worlds. Sixty guardians." />
        <WorldMap />
      </section>

      {/* ---------------- how it works ---------------- */}
      <section className="mx-auto max-w-[1200px] px-4 py-12" aria-label="How it works">
        <SectionTitle kicker="How it works" title="Short sessions. Long streaks." />
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.title} className="px-panel flex gap-4 p-4">
              <span className="grid size-12 shrink-0 place-items-center bg-teal text-bg-0" style={{ boxShadow: "inset -4px -4px 0 #135b73" }}>
                <PixelIcon name={s.icon} size={24} />
              </span>
              <div>
                <h3 className="text-[18px] leading-6 text-text">{s.title}</h3>
                <p className="mt-1 text-[15px] leading-5 text-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------- boss teaser ---------------- */}
      <section data-palette="boss" className="mx-auto max-w-[1200px] px-4 py-12" aria-label="Boss events">
        <div data-accent="true" className="px-panel scanlines relative grid items-center gap-6 overflow-hidden p-6 md:grid-cols-[auto_1fr] md:p-10" style={{ background: "linear-gradient(135deg, #3a0a14 0%, #14161d 70%)" }}>
          <div className="relative mx-auto">
            <div aria-hidden="true" className="absolute inset-0" style={{ background: "radial-gradient(closest-side, rgb(255 59 92 / 0.35), transparent)" }} />
            <VoxelViewer encoding={boss.encoding} size={200} resolution={56} rim="#FF3B5C" label={`Boss ${boss.name}`} />
          </div>
          <div>
            <p className="font-label text-[13px] text-accent-2 uppercase">Bosses · weekly raids</p>
            <h2 className="mt-2 text-[32px] leading-10 text-accent md:text-[40px] md:leading-[48px]">{boss.name}, the Warden</h2>
            <p className="mt-3 max-w-[520px] text-[16px] leading-6 text-text">
              Weekly raids: three chained puzzles against the clock. Every solve chips its HP bar. Win up to {EARN.bossWinMax.toLocaleString("en-US")} shards and a spot on the boss board.
            </p>
            <div className="mt-4 max-w-[420px]" aria-hidden="true">
              <div className="flex justify-between font-label text-[12px] text-muted">
                <span>HP</span>
                <span>3 / 3 STAGES</span>
              </div>
              <div className="px-border mt-1 h-4 bg-bg-0" style={{ ["--pb" as string]: "#FF3B5C" }}>
                <div className="h-full" style={{ width: "72%", background: "repeating-linear-gradient(90deg, #FF3B5C 0 12px, #c92a47 12px 14px)" }} />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <PixelButton href="/bosses" palette="boss">
                <PixelIcon name="skull" size={16} /> Enter the arena
              </PixelButton>
              <span className="font-label text-[13px] text-muted">
                ENTRY {BOSS_ENTRY.shards} ◆{publicEnv.marketOpen ? ` OR ${formatSol(BOSS_ENTRY.lamports)} DEVNET SOL` : ""}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- seeker ---------------- */}
      <section id="get-seeker" className="mx-auto max-w-[1200px] scroll-mt-24 px-4 py-12" aria-label="Get on Seeker">
        <div data-palette="frost" data-accent="true" className="px-panel flex flex-col items-start gap-4 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div>
            <p className="font-label text-[13px] text-accent uppercase">Solana Seeker</p>
            <h2 className="mt-1 text-[24px] leading-8 text-text md:text-[32px] md:leading-10">Built for the phone in your pocket.</h2>
            <p className="mt-2 max-w-[560px] text-[15px] leading-6 text-muted">
              Native Android build with haptics, gyroscope parallax and 60 fps pixel combat, made for the Seeker. Coming to the Solana dApp Store — play the same game in the browser today.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <PixelButton href="/play" palette="frost">Play now</PixelButton>
            <PixelButton href="/market" variant="secondary" palette="link">
              Visit the shop
            </PixelButton>
          </div>
        </div>
      </section>

      {/* ---------------- partners & built with ---------------- */}
      <BuiltWith />
    </div>
  );
}

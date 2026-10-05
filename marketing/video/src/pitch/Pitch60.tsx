import React from "react";
import { AbsoluteFill, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ASSETS } from "../assets";
import { Ambient } from "../components/Ambient";
import { Phone } from "../components/Phone";
import { Shot } from "../components/Shot";
import { Music, Sting } from "../components/Sound";
import { ShotId } from "../shots";
import { C, FONT_DISPLAY, PALETTE, PaletteName, sec } from "../theme";

/**
 * 60 s landscape pitch video (Colosseum / investors / X): the pitch deck as kinetic typography over real gameplay.
 * Story: problem → reveal → core loop → modes → Daily → shipped → market → why Solana → ask → end card.
 * Numbers match the deck (docs/pitch, ODLET Pitch Deck). Voice-over script: docs/pitch/06-pitch-video-vo.md.
 */
export const PITCH60_FRAMES = 1800;
export const PITCH_W = 1920;
export const PITCH_H = 1080;

const FONT_HEAD = "'Space Grotesk', Arial, sans-serif";
const INK = "#F2F2EE";
const SOFT = "#C3C7CD";

const enter = (frame: number, fps: number, delay = 0, dur = 14) =>
  spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: dur });
const fade = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, to], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** A big kinetic line: slams from 1.18× with a short blur-free spring. */
const Word: React.FC<{
  text: string;
  delay?: number;
  size?: number;
  color?: string;
  weight?: number;
  align?: "left" | "center";
  style?: React.CSSProperties;
}> = ({ text, delay = 0, size = 180, color = INK, weight = 700, align = "center", style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 240 }, durationInFrames: 12 });
  return (
    <div
      style={{
        fontFamily: FONT_HEAD,
        fontWeight: weight,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: -size * 0.04,
        color,
        textAlign: align,
        whiteSpace: "pre-line",
        opacity: fade(frame, delay, delay + 3),
        transform: `scale(${interpolate(s, [0, 1], [1.18, 1])})`,
        transformOrigin: align === "left" ? "left center" : "center",
        ...style,
      }}
    >
      {text}
    </div>
  );
};

const Eyebrow: React.FC<{ text: string; color?: string; delay?: number; align?: "left" | "center" }> = ({
  text,
  color = C.teal,
  delay = 0,
  align = "left",
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        fontFamily: FONT_DISPLAY,
        fontSize: 30,
        letterSpacing: 6,
        textTransform: "uppercase",
        color,
        textAlign: align,
        opacity: fade(frame, delay, delay + 6),
      }}
    >
      {text}
    </div>
  );
};

const Line: React.FC<{ text: string; delay?: number; size?: number; color?: string; align?: "left" | "center" }> = ({
  text,
  delay = 0,
  size = 44,
  color = SOFT,
  align = "left",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const e = enter(frame, fps, delay);
  return (
    <div
      style={{
        fontFamily: FONT_HEAD,
        fontWeight: 500,
        fontSize: size,
        lineHeight: 1.3,
        color,
        textAlign: align,
        opacity: e,
        transform: `translateY(${interpolate(e, [0, 1], [24, 0])}px)`,
      }}
    >
      {text}
    </div>
  );
};

const Scene: React.FC<{ palette?: PaletteName; plain?: boolean; children: React.ReactNode }> = ({ palette = "lab", plain, children }) => (
  <AbsoluteFill>
    {plain ? <AbsoluteFill style={{ background: C.bg0 }} /> : <Ambient palette={palette} />}
    {children}
  </AbsoluteFill>
);

/** The hand-drawn ODLET pixel wordmark from the brand kit (672×176), or a text fallback. */
const Wordmark: React.FC<{ width: number; progress: number }> = ({ width, progress }) => {
  const style: React.CSSProperties = { opacity: progress, transform: `scale(${interpolate(progress, [0, 1], [1.25, 1])})` };
  if (ASSETS.stills.includes("logo-wordmark.png")) {
    return (
      <Img
        src={staticFile("shots/logo-wordmark.png")}
        style={{ width, height: Math.round((width * 176) / 672), imageRendering: "pixelated", filter: "drop-shadow(0 0 60px rgba(17,197,179,0.35))", ...style }}
      />
    );
  }
  return <div style={{ fontFamily: FONT_DISPLAY, fontSize: width / 4, letterSpacing: 8, color: C.teal, ...style }}>ODLET</div>;
};

/** White flash on a hard cut (the "drop"). */
const Flash: React.FC<{ len?: number }> = ({ len = 6 }) => {
  const frame = useCurrentFrame();
  return <AbsoluteFill style={{ background: "#FFFFFF", opacity: interpolate(frame, [0, len], [0.85, 0], { extrapolateRight: "clamp" }) }} />;
};

// ---------------------------------------------------------------------------------------------
// scenes
// ---------------------------------------------------------------------------------------------

/** 0–4.3 s: the problem, one phrase per beat. */
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const phrases: Array<[string, number, number, string]> = [
    ["Brain games", 0, 27, INK],
    ["feel like", 27, 48, INK],
    ["homework.", 48, 84, C.yellow],
    ["So people quit.", 84, 129, "#8A94A6"],
  ];
  return (
    <Scene plain>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        {phrases.map(([t, a, b, col]) =>
          frame >= a && frame < b ? (
            <Sequence key={t} from={a} durationInFrames={b - a} layout="none">
              <Word text={t} size={t.length > 12 ? 150 : 210} color={col} />
            </Sequence>
          ) : null,
        )}
      </AbsoluteFill>
    </Scene>
  );
};

/** 4.3–8 s: the reveal. */
const Reveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = enter(frame, fps, 0, 16);
  return (
    <Scene palette="lab">
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40 }}>
        <Wordmark width={1000} progress={logo} />
        <Word text="Solve to strike." delay={18} size={110} />
      </AbsoluteFill>
      <Flash />
    </Scene>
  );
};

/** 8–20 s: the core loop next to real Battle footage. */
const Loop: React.FC = () => {
  const frame = useCurrentFrame();
  const steps: Array<[string, string, number, string]> = [
    ["SOLVE", "a 3–10 second puzzle", 0, INK],
    ["STRIKE", "the monster. Faster hits harder.", 90, INK],
    ["MULTIPLY", "chain combos: chips × mult", 180, C.yellow],
  ];
  const active = frame < 90 ? 0 : frame < 180 ? 1 : 2;
  const mult = frame < 270 ? 0 : Math.min(4, 1 + Math.floor((frame - 270) / 22));
  return (
    <Scene palette="prism">
      <div style={{ position: "absolute", left: 1160, top: 60 }}>
        <Phone height={900} accent={PALETTE.prism.accent}>
          <Shot id="battle-combo" offset={-4.6} />
        </Phone>
      </div>
      <div style={{ position: "absolute", left: 140, top: 250, width: 940, display: "flex", flexDirection: "column", gap: 26 }}>
        <Eyebrow text="Every right answer is an attack" color={PALETTE.prism.accent} />
        {frame < 270 ? (
          <Sequence key={active} from={steps[active][2]} layout="none">
            <Word text={steps[active][0]} size={220} align="left" color={steps[active][3]} />
            <Line text={steps[active][1]} delay={6} size={52} />
          </Sequence>
        ) : (
          <Sequence from={270} layout="none">
            <ChipsRow mult={mult} />
            <Line text={`${20 * mult} damage. Combo ×${mult}.`} delay={4} size={52} color={INK} />
          </Sequence>
        )}
      </div>
    </Scene>
  );
};

const ChipsRow: React.FC<{ mult: number }> = ({ mult }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame % 22, fps, config: { damping: 12, stiffness: 260 }, durationInFrames: 10 });
  const box = (v: number, bg: string, border: string, scale = 1) => (
    <div
      style={{
        minWidth: 230,
        padding: "18px 34px",
        background: bg,
        border: `6px solid ${border}`,
        fontFamily: FONT_DISPLAY,
        fontWeight: 400, // Silkscreen Bold turns digits into blobs at this size
        fontSize: 120,
        color: INK,
        textAlign: "center",
        boxShadow: "0 14px 0 rgba(0,0,0,0.45)",
        transform: `scale(${scale})`,
      }}
    >
      {v}
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 28, height: 220 }}>
      {box(20, C.chips, "#8DB6FF")}
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 90, color: INK }}>×</div>
      {box(mult, C.mult, "#FF9AAE", interpolate(pop, [0, 1], [1.35, 1]))}
    </div>
  );
};

/** 20–27.5 s: four modes, four phones. */
const Modes: React.FC = () => {
  const modes: Array<[ShotId, string, PaletteName]> = [
    ["battle-combo", "Battle", "prism"],
    ["rune-play", "Rune Hand", "lab"],
    ["ice-dash", "Ice Dash", "frost"],
    ["beat-crawl", "Beat Crawl", "ember"],
  ];
  return (
    <Scene palette="lab">
      <div style={{ position: "absolute", left: 0, right: 0, top: 70, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <Word text="Four ways to fight." size={96} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 230, display: "flex", justifyContent: "center", gap: 44 }}>
        {modes.map(([id, label, pal], i) => (
          <Sequence key={id} from={6 + i * 9} layout="none">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
              <Phone height={660} accent={PALETTE[pal].accent}>
                <Shot id={id} />
              </Phone>
              <Eyebrow text={label} color={PALETTE[pal].accent} align="center" delay={6} />
            </div>
          </Sequence>
        ))}
      </div>
    </Scene>
  );
};

/** 27.5–32.5 s: the Daily habit. */
const Daily: React.FC = () => (
  <Scene palette="daily">
    <div style={{ position: "absolute", left: 200, top: 60 }}>
      <Phone height={900} accent={PALETTE.daily.accent}>
        <Shot id="daily" />
      </Phone>
    </div>
    <div style={{ position: "absolute", left: 820, top: 300, width: 1000, display: "flex", flexDirection: "column", gap: 18 }}>
      <Eyebrow text="The Daily" color={PALETTE.daily.accent} />
      <Word text="3 trials." size={150} align="left" delay={4} />
      <Word text="Every day." size={150} align="left" delay={30} />
      <Line text="Same for every player. Streaks and a real rating." delay={60} size={46} />
    </div>
  </Scene>
);

const Count: React.FC<{ to: number; suffix?: string; delay: number; label: string }> = ({ to, suffix = "", delay, label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = interpolate(frame, [delay, delay + 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const eased = 1 - Math.pow(1 - t, 3);
  const e = enter(frame, fps, delay);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, opacity: e, transform: `translateY(${interpolate(e, [0, 1], [30, 0])}px)` }}>
      <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 170, lineHeight: 1, letterSpacing: -6, color: C.yellow }}>
        {Math.round(to * eased)}
        {suffix}
      </div>
      <div style={{ fontFamily: FONT_HEAD, fontWeight: 500, fontSize: 40, color: SOFT }}>{label}</div>
    </div>
  );
};

/** 32.5–40 s: what is already shipped. */
const Shipped: React.FC = () => (
  <Scene palette="lab">
    <div style={{ position: "absolute", left: 140, right: 140, top: 150, display: "flex", flexDirection: "column", gap: 70 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Eyebrow text="Pre-launch. Already built." />
        <Word text="The whole game ships today." size={100} align="left" />
      </div>
      <div style={{ display: "flex", gap: 120 }}>
        <Count to={60} delay={20} label="levels, 5 worlds, 4 modes" />
        <Count to={500} suffix="+" delay={38} label="automated tests" />
        <Count to={16} suffix=" MB" delay={56} label="APK, plays offline" />
      </div>
      <Line text="Built in-house by two engineers. Android and web." delay={90} size={44} color="#8FE3D9" />
    </div>
  </Scene>
);

/** 40–47 s: market and beachhead, one number per beat. */
const Market: React.FC = () => {
  const frame = useCurrentFrame();
  const beats: Array<[string, string, string, number]> = [
    ["$10B+", "a year on mobile puzzle games", "Sensor Tower, 2025", 0],
    ["150K+", "Seeker owners, one store, few real games", "Solana Mobile, Jan 2026", 60],
    ["0%", "store fee on the Solana dApp Store", "Solana Compass, 2026", 120],
  ];
  const i = frame < 60 ? 0 : frame < 120 ? 1 : 2;
  const [num, cap, src, at] = beats[i];
  return (
    <Scene palette={i === 1 ? "lab" : "prism"}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 20 }}>
        <Eyebrow text="Why now" align="center" />
        <Sequence key={i} from={at} layout="none">
          <Word text={num} size={300} color={i === 1 ? C.teal : C.yellow} />
          <Line text={cap} delay={5} size={56} color={INK} align="center" />
          <Line text={src} delay={10} size={30} color="#8A94A6" align="center" />
        </Sequence>
      </AbsoluteFill>
    </Scene>
  );
};

/** 47–51.5 s: why Solana. */
const Solana: React.FC = () => (
  <Scene palette="daily">
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 26 }}>
      <Word text="Play without crypto." size={130} color={SOFT} weight={500} />
      <Word text="Own what you earn." size={150} delay={40} color={C.teal} />
      <Line text="Seeker-verified perks · voxel collectibles on Metaplex Core · the buyer signs, we never hold funds" delay={70} size={34} color="#8A94A6" align="center" />
    </AbsoluteFill>
  </Scene>
);

/** 51.5–56 s: the ask. */
const Ask: React.FC = () => (
  <Scene palette="prism">
    <div style={{ position: "absolute", left: 140, right: 140, top: 180, display: "flex", flexDirection: "column", gap: 26 }}>
      <Eyebrow text="The ask" color={PALETTE.prism.accent} />
      <Word text="$250K pre-seed" size={180} align="left" color={C.yellow} />
      <Line text="18 months, two full-time founders." delay={14} size={56} color={INK} />
      <div style={{ display: "flex", gap: 70, marginTop: 30 }}>
        <Line text="M3 · 10K installs" delay={34} size={44} />
        <Line text="M6 · first revenue" delay={44} size={44} />
        <Line text="M12 · 100K players" delay={54} size={44} />
      </div>
    </div>
  </Scene>
);

/** 56–60 s: end card. */
const End: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = enter(frame, fps, 0, 16);
  return (
    <Scene palette="lab">
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 36 }}>
        <Wordmark width={820} progress={logo} />
        <Word text="Your brain is the weapon." size={84} delay={12} />
        <Line text="odlet.xyz · @odletxyz · hello@odlet.xyz" delay={26} size={40} color="#8FE3D9" align="center" />
      </AbsoluteFill>
    </Scene>
  );
};

// ---------------------------------------------------------------------------------------------
// timeline (seconds)
// ---------------------------------------------------------------------------------------------

const TIMELINE: Array<[React.FC, number, number]> = [
  [Hook, 0, 4.3],
  [Reveal, 4.3, 8],
  [Loop, 8, 20],
  [Modes, 20, 27.5],
  [Daily, 27.5, 32.5],
  [Shipped, 32.5, 40],
  [Market, 40, 47],
  [Solana, 47, 51.5],
  [Ask, 51.5, 56],
  [End, 56, 60],
];

export const Pitch60: React.FC<{ music?: boolean }> = ({ music = true }) => (
  <AbsoluteFill style={{ background: C.bg0 }}>
    {TIMELINE.map(([View, a, b]) => (
      <Sequence key={a} from={sec(a)} durationInFrames={sec(b) - sec(a)} premountFor={30}>
        <View />
      </Sequence>
    ))}
    {music ? (
      <>
        <Music file="music_daily_i2.wav" from={0} duration={sec(4.4)} volume={0.35} fadeOut={6} />
        <Music file="music_herorun_i2.wav" from={sec(4.3)} duration={sec(27.4)} volume={0.8} fadeOut={20} />
        <Music file="music_world1_i2.wav" from={sec(31.2)} duration={sec(28.8)} volume={0.75} fadeOut={45} />
        <Sting file="stinger_levelup.wav" at={sec(4.3)} volume={0.9} />
        <Sting file="stinger_combo.wav" at={sec(11)} volume={0.9} />
        <Sting file="stinger_combo.wav" at={sec(14)} volume={0.9} />
        {[0, 1, 2, 3].map((k) => (
          <Sting key={k} file="stinger_combo.wav" at={sec(17) + k * 22} volume={0.8} />
        ))}
        <Sting file="stinger_combo.wav" at={sec(40)} volume={0.7} />
        <Sting file="stinger_combo.wav" at={sec(42)} volume={0.7} />
        <Sting file="stinger_combo.wav" at={sec(44)} volume={0.7} />
        <Sting file="stinger_victory.wav" at={sec(56)} volume={0.9} />
      </>
    ) : null}
  </AbsoluteFill>
);

export const Pitch60Silent: React.FC = () => <Pitch60 music={false} />;

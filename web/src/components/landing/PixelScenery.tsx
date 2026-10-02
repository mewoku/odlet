/**
 * Pixel dioramas drawn as crisp SVG rects: banded sky, far silhouettes, near props and a ground strip.
 * Same five places as the app's Scenery element (client/.../Components/Scenery.cs).
 */

export type SceneryKind = "forest" | "castle" | "frost" | "lab" | "dunes";

export const SCENERY_KINDS: readonly SceneryKind[] = ["forest", "castle", "frost", "lab", "dunes"];

export const SCENERY_NAME: Record<SceneryKind, string> = {
  forest: "Pine woods",
  castle: "Old keep",
  frost: "Frost peaks",
  lab: "The Lab",
  dunes: "Ember dunes",
};

const PAL: Record<SceneryKind, { accent: string; accent2: string; ambient: string }> = {
  forest: { accent: "#9be35a", accent2: "#2f8f4e", ambient: "#10301a" },
  castle: { accent: "#ff4fd8", accent2: "#7b5cff", ambient: "#2a1450" },
  frost: { accent: "#8fe3ff", accent2: "#3a6bff", ambient: "#0c2250" },
  lab: { accent: "#11c5b3", accent2: "#135b73", ambient: "#0b3b4a" },
  dunes: { accent: "#ffb347", accent2: "#ff6b5a", ambient: "#4a1e12" },
};

/** Scenery for a figure key (any stable string), the same on every render. */
export function sceneryFor(key: string): SceneryKind {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return SCENERY_KINDS[h % SCENERY_KINDS.length]!;
}

function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i]! - v) * t)).join(" ")})`;
}

type R = [x: number, y: number, w: number, h: number, fill: string, opacity?: number];

/** Stepped triangle (pine, peak, dune) as one-pixel rows. */
function steps(out: R[], cx: number, baseY: number, half: number, height: number, fill: string) {
  for (let r = 0; r < height; r++) {
    const w = Math.max(1, Math.round((half * (r + 1)) / height));
    out.push([Math.round(cx - w), Math.round(baseY - height + r), w * 2, 1, fill]);
  }
}

function seeded(n: number) {
  let s = n * 7919 + 17;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Ground fill, for callers that draw the ground strip themselves (see `ground`). */
export function groundColor(kind: SceneryKind): string {
  return mix(PAL[kind].ambient, "#07080b", 0.4);
}

export function sceneryAccent(kind: SceneryKind): string {
  return PAL[kind].accent;
}

/** Width/height in art pixels; the SVG scales them up with crisp edges. */
export const W = 160;
export const H = 90;
/** Ground line in art pixels from the top. */
export const GROUND = 72;

function build(kind: SceneryKind, wide: boolean, ground: boolean): R[] {
  const p = PAL[kind];
  const w = wide ? W * 2 : W;
  const out: R[] = [];
  const top = mix("#07080b", p.ambient, 0.35);
  const low = mix(p.ambient, p.accent2, 0.35);
  // Sky: dark top, then three stacked translucent bands of the low colour, so it steps lighter downwards.
  out.push([0, 0, w, GROUND, top]);
  for (let b = 1; b < 4; b++) out.push([0, (GROUND * b) / 4, w, GROUND - (GROUND * b) / 4, low, 0.33]);
  const rnd = seeded(SCENERY_KINDS.indexOf(kind));
  for (let i = 0; i < (wide ? 26 : 14); i++) out.push([Math.floor(rnd() * w), Math.floor(rnd() * GROUND * 0.5), 1, 1, "#ffffff", 0.15 + rnd() * 0.25]);

  const far = mix(p.ambient, "#07080b", 0.25);
  const near = mix(p.accent2, "#07080b", 0.45);
  const prop = p.accent2;
  const reps = wide ? 2 : 1;

  for (let rep = 0; rep < reps; rep++) {
    const ox = rep * W;
    switch (kind) {
      case "forest":
        for (let i = 0; i < 7; i++) steps(out, ox + (W * (i + 0.5)) / 7, GROUND, 11, 30 + 7 * (i % 3), far);
        steps(out, ox + W * 0.1, GROUND, 14, 44, near);
        out.push([ox + W * 0.1 - 1, GROUND - 2, 2, 2, "#4a2e1a"]);
        steps(out, ox + W * 0.9, GROUND, 13, 38, near);
        for (let i = 0; i < 4; i++) {
          const x = Math.round(ox + W * (0.22 + i * 0.2));
          out.push([x, GROUND - 3, 6, 3, prop], [x + 1, GROUND - 4, 4, 1, prop]);
        }
        break;
      case "castle": {
        out.push([ox + 8, GROUND - 25, W - 16, 25, far]);
        for (let x = ox + 8; x < ox + W - 8; x += 4) out.push([x, GROUND - 27, 2, 2, far]);
        for (const tx of [0.14, 0.86]) {
          const cx = Math.round(ox + W * tx);
          out.push([cx - 11, GROUND - 45, 22, 45, near]);
          for (let k = 0; k < 3; k++) out.push([cx - 11 + k * 9, GROUND - 48, 3, 3, near]);
          out.push([cx - 1, GROUND - 34, 2, 4, "#ffc83d", 0.85]);
        }
        out.push([ox + Math.round(W * 0.86), GROUND - 54, 1, 6, near], [ox + Math.round(W * 0.86) + 1, GROUND - 54, 4, 3, p.accent]);
        break;
      }
      case "frost":
        steps(out, ox + W * 0.22, GROUND, 48, 50, far);
        steps(out, ox + W * 0.75, GROUND, 54, 56, far);
        steps(out, ox + W * 0.75, GROUND - 56 + 12, 12, 12, "#ffffff");
        steps(out, ox + W * 0.22, GROUND - 50 + 11, 11, 11, "#ffffff");
        steps(out, ox + W * 0.5, GROUND, 35, 27, near);
        for (let i = 0; i < 18; i++) out.push([Math.floor(ox + rnd() * W), Math.floor(rnd() * GROUND), 1, 1, "#ffffff", 0.5]);
        break;
      case "lab":
        for (let i = 0; i < 6; i++) {
          const x = Math.round(ox + W * (0.04 + i * 0.17));
          const ph = Math.round(32 + 9 * (((i * 3) % 4) / 3));
          out.push([x, GROUND - ph, 14, ph, far], [x + 1, GROUND - ph + 2, 12, 1, p.accent, 0.6]);
        }
        for (let x = ox; x < ox + W; x += 8) out.push([x, GROUND - 1, 4, 1, p.accent, 0.35]);
        out.push([ox + Math.round(W * 0.12), 18, 3, 3, "#e8da37"], [ox + Math.round(W * 0.84), 25, 3, 3, p.accent]);
        break;
      default:
        out.push([ox + Math.round(W * 0.72), 11, 6, 6, p.accent, 0.9]);
        steps(out, ox + W * 0.25, GROUND, 64, 20, far);
        steps(out, ox + W * 0.8, GROUND, 56, 16, near);
        out.push([ox + Math.round(W * 0.12), GROUND - 9, 2, 9, prop], [ox + Math.round(W * 0.12) - 2, GROUND - 6, 2, 1, prop], [ox + Math.round(W * 0.12) - 2, GROUND - 8, 1, 2, prop]);
        break;
    }
  }

  if (!ground) return out;
  out.push([0, GROUND, w, H - GROUND, groundColor(kind)]);
  out.push([0, GROUND, w, 1, p.accent, 0.7]);
  for (let y = GROUND + 2; y < H; y += 3) for (let x = (y % 2) * 2; x < w; x += 4) out.push([x, y, 1, 1, "#000000", 0.25]);
  return out;
}

/**
 * Full-bleed pixel backdrop. `wide` doubles the art width for banner use; the SVG keeps the bottom
 * anchored and crops the sky when the box is wider or taller than the art. With `ground={false}` the
 * art ends at the ground line, so a caller can put a fixed-height ground strip (and figures) under it.
 */
export function PixelScenery({ kind, wide = false, ground = true, className = "" }: { kind: SceneryKind; wide?: boolean; ground?: boolean; className?: string }) {
  const rects = build(kind, wide, ground);
  const w = wide ? W * 2 : W;
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${w} ${ground ? H : GROUND}`}
      preserveAspectRatio="xMidYMax slice"
      shapeRendering="crispEdges"
      className={`block h-full w-full ${className}`}
    >
      {rects.map(([x, y, rw, rh, fill, opacity], i) => (
        <rect key={i} x={x} y={y} width={rw} height={rh} fill={fill} opacity={opacity} />
      ))}
    </svg>
  );
}

import { PALETTES, WORLD_PALETTES } from "@/lib/palettes";

/**
 * Pixel overworld: five islands in a dark sea, joined by a dotted trail, each with its own landmark
 * (lab towers, prism crystals, ember dunes, grove pines, frost peaks). Pure SVG rects with crisp
 * edges, the same on server and client. World names sit on top as HTML so the text stays sharp.
 */

const W = 240;
const H = 100;

type R = [x: number, y: number, w: number, h: number, fill: string, opacity?: number];

interface Isle {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

const ISLES: Isle[] = [
  { cx: 28, cy: 62, rx: 22, ry: 17 },
  { cx: 75, cy: 36, rx: 22, ry: 16 },
  { cx: 122, cy: 64, rx: 23, ry: 17 },
  { cx: 170, cy: 36, rx: 22, ry: 16 },
  { cx: 214, cy: 62, rx: 21, ry: 17 },
];

function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i]! - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

/** Deterministic hash noise in [0, 1). */
function noise(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function insideIsle(isle: Isle, x: number, y: number, seed: number): boolean {
  const dx = (x - isle.cx) / isle.rx;
  const dy = (y - isle.cy) / isle.ry;
  // Coarse 4×4 noise cells make a ragged pixel coastline instead of a perfect ellipse.
  const n = noise(Math.floor(x / 4), Math.floor(y / 4), seed);
  return dx * dx + dy * dy < 0.82 + n * 0.32;
}

/** Push horizontal runs of a predicate as single rects (keeps the rect count low). */
function runs(out: R[], x0: number, x1: number, y0: number, y1: number, test: (x: number, y: number) => boolean, fill: string, opacity?: number) {
  for (let y = y0; y < y1; y++) {
    let start = -1;
    for (let x = x0; x <= x1; x++) {
      const on = x < x1 && test(x, y);
      if (on && start < 0) start = x;
      if (!on && start >= 0) {
        out.push([start, y, x - start, 1, fill, opacity]);
        start = -1;
      }
    }
  }
}

function steps(out: R[], cx: number, baseY: number, half: number, height: number, fill: string) {
  for (let r = 0; r < height; r++) {
    const w = Math.max(1, Math.round((half * (r + 1)) / height));
    out.push([Math.round(cx - w), Math.round(baseY - height + r), w * 2, 1, fill]);
  }
}

function landmark(out: R[], world: number, isle: Isle) {
  const p = PALETTES[WORLD_PALETTES[world]!.palette];
  const { cx, cy } = isle;
  const dark = mix(p.ambient, "#07080b", 0.3);
  switch (world) {
    case 0: // LAB: three towers with lit windows
      for (const [ox, h] of [
        [-12, 14],
        [-3, 19],
        [7, 12],
      ] as const) {
        out.push([cx + ox, cy - h - 2, 7, h, dark], [cx + ox + 1, cy - h - 2, 5, 1, p.accent]);
        for (let wy = cy - h + 1; wy < cy - 4; wy += 3) out.push([cx + ox + 2, wy, 1, 1, p.accent, 0.9], [cx + ox + 4, wy, 1, 1, "#e8da37", 0.8]);
      }
      break;
    case 1: // PRISM: crystal shards
      for (const [ox, h, c] of [
        [-10, 12, p.accent],
        [-2, 18, p.accent2],
        [7, 10, p.accent],
      ] as const) {
        for (let r = 0; r < h; r++) {
          const w = Math.max(1, Math.round(3 - Math.abs(r - h * 0.35) / (h * 0.25)));
          out.push([cx + ox - w, cy - 3 - h + r, w * 2, 1, c, r % 3 === 0 ? 0.75 : 1]);
        }
        out.push([cx + ox - 1, cy - 3 - h + 2, 1, 3, "#ffffff", 0.7]);
      }
      break;
    case 2: // EMBER: dunes under a hot sun
      out.push([cx + 9, cy - 22, 6, 6, "#ffc83d"], [cx + 8, cy - 21, 8, 4, "#ffc83d"], [cx + 10, cy - 23, 4, 8, "#ffc83d"]);
      steps(out, cx - 6, cy - 1, 13, 9, mix(p.accent2, "#07080b", 0.25));
      steps(out, cx + 7, cy, 11, 6, p.accent);
      break;
    case 3: // GROVE: pines
      for (const [ox, h] of [
        [-11, 13],
        [-3, 18],
        [6, 14],
        [12, 10],
      ] as const) {
        steps(out, cx + ox, cy - 1, Math.round(h / 3), h, ox === -3 ? p.accent2 : mix(p.accent2, "#07080b", 0.3));
        out.push([cx + ox - 1, cy - 1, 2, 2, "#4a2e1a"]);
      }
      break;
    default: // FROST: snowy peaks
      steps(out, cx - 6, cy - 1, 14, 18, mix(p.accent2, "#07080b", 0.35));
      steps(out, cx - 6, cy - 19 + 6, 5, 6, "#ffffff");
      steps(out, cx + 8, cy, 11, 13, mix(p.accent2, "#07080b", 0.15));
      steps(out, cx + 8, cy - 13 + 4, 4, 4, "#ffffff");
      break;
  }
}

function build(): R[] {
  const out: R[] = [];
  const sea = "#071820";
  out.push([0, 0, W, H, sea]);
  // Wave glints.
  for (let y = 2; y < H; y += 5) for (let x = (y * 7) % 11; x < W; x += 11) if (noise(x, y, 9) > 0.55) out.push([x, y, 2, 1, "#8fe3ff", 0.12]);

  ISLES.forEach((isle, i) => {
    const p = PALETTES[WORLD_PALETTES[i]!.palette];
    const x0 = isle.cx - isle.rx - 4;
    const x1 = isle.cx + isle.rx + 4;
    const y0 = isle.cy - isle.ry - 4;
    const y1 = isle.cy + isle.ry + 4;
    const land = (x: number, y: number) => insideIsle(isle, x, y, i + 1);
    // Shallow water ring, cliff shadow (one pixel lower), land, then a lit rim on the top edge.
    runs(out, x0 - 2, x1 + 2, y0 - 2, y1 + 3, (x, y) => !land(x, y) && (land(x - 2, y) || land(x + 2, y) || land(x, y - 2) || land(x, y + 2)), "#8fe3ff", 0.1);
    runs(out, x0, x1, y0, y1 + 2, (x, y) => !land(x, y) && land(x, y - 2), mix(p.ambient, "#07080b", 0.55));
    runs(out, x0, x1, y0, y1, land, mix(p.ambient, p.accent2, 0.35));
    runs(out, x0, x1, y0, y1, (x, y) => land(x, y) && noise(x, y, i + 20) > 0.86, p.accent2, 0.45);
    runs(out, x0, x1, y0, y1, (x, y) => land(x, y) && !land(x, y - 1), p.accent, 0.8);
  });

  // Dotted trail from island to island (Bresenham, every other pixel).
  for (let i = 0; i < ISLES.length - 1; i++) {
    const a = ISLES[i]!;
    const b = ISLES[i + 1]!;
    const ax = a.cx + 10;
    const ay = a.cy + 4;
    const bx = b.cx - 10;
    const by = b.cy + 4;
    const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let k = 0; k <= n; k += 3) {
      const x = Math.round(ax + ((bx - ax) * k) / n);
      const y = Math.round(ay + ((by - ay) * k) / n);
      out.push([x, y, 2, 2, "#e8da37", 0.85]);
    }
  }

  ISLES.forEach((isle, i) => {
    landmark(out, i, isle);
    // Level node: a small flag stone at the island's front.
    const p = PALETTES[WORLD_PALETTES[i]!.palette];
    out.push([isle.cx - 3, isle.cy + 5, 7, 4, "#07080b"], [isle.cx - 2, isle.cy + 5, 5, 3, i === ISLES.length - 1 ? PALETTES.boss.accent : p.accent]);
  });
  return out;
}

const RECTS = build();

export function Overworld() {
  return (
    <div className="overflow-x-auto">
      <div className="px-border relative min-w-[640px] bg-[#071820]" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg aria-hidden="true" viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" className="block h-full w-full">
          {RECTS.map(([x, y, rw, rh, fill, opacity], i) => (
            <rect key={i} x={x} y={y} width={rw} height={rh} fill={fill} opacity={opacity} />
          ))}
        </svg>
        <ol aria-label="World map" className="absolute inset-0">
          {ISLES.map((isle, i) => {
            const w = WORLD_PALETTES[i]!;
            const top = isle.cy + isle.ry < H - 16;
            return (
              <li
                key={w.name}
                data-palette={w.palette}
                className="absolute -translate-x-1/2 text-center whitespace-nowrap"
                style={{ left: `${(isle.cx / W) * 100}%`, top: `${((top ? isle.cy + isle.ry + 3 : isle.cy - isle.ry - 12) / H) * 100}%` }}
              >
                <span className="bg-[rgb(7_8_11/0.8)] px-2 py-1 font-label text-[12px] text-muted">
                  W{i + 1} <span className="text-accent">{w.name}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

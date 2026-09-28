import { hexToRgb, type Palette } from "@/lib/palettes";

/** CSS px per ambient pixel. */
export const AMBIENT_PIXEL = 6;
/** Quantisation steps per blob. */
export const AMBIENT_LEVELS = 5;
/** Repaint rate. */
export const AMBIENT_FPS = 15;

/** Ordered-dither Bayer 4×4 thresholds (0..1). */
export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

const BASE_TOP: [number, number, number] = [7, 8, 11];
const BASE_BOTTOM: [number, number, number] = [14, 16, 22];

export interface AmbientBlob {
  color: [number, number, number];
  strength: number;
  /** Fraction of the larger viewport side. */
  radius: number;
  /** Rest position (fraction of the viewport). */
  px: number;
  py: number;
  /** Drift amplitude (fraction of the viewport). */
  ax: number;
  ay: number;
  /** Drift frequency (cycles per second). */
  sx: number;
  sy: number;
}

export function ambientBlobs(p: Palette): AmbientBlob[] {
  const amb = hexToRgb(p.ambient);
  const a2 = hexToRgb(p.accent2);
  // ambient hue lifted a little toward accent2 so it reads on the near-black base
  const lifted = [0, 1, 2].map((i) => Math.min(255, amb[i]! * 1.35 + a2[i]! * 0.15)) as [number, number, number];
  return [
    { color: lifted, strength: 1.0, radius: 0.7, px: 0.2, py: 0.15, ax: 0.22, ay: 0.12, sx: 0.011, sy: 0.017 },
    { color: a2, strength: 0.55, radius: 0.5, px: 0.85, py: 0.6, ax: 0.2, ay: 0.16, sx: 0.013, sy: 0.009 },
    { color: hexToRgb(p.accent), strength: 0.28, radius: 0.36, px: 0.5, py: 0.95, ax: 0.26, ay: 0.2, sx: 0.007, sy: 0.012 },
  ];
}

/**
 * Paints the ambient field at time `t` (seconds) into `image`: vertical base gradient, then each
 * blob's falloff² quantised to LEVELS with a screen-fixed Bayer threshold and blended over it.
 */
export function renderAmbient(image: ImageData, blobs: AmbientBlob[], t: number): void {
  const { width: w, height: h, data } = image;
  const side = Math.max(w, h);
  const centres = blobs.map((b) => ({
    x: (b.px + Math.sin(t * b.sx * 2 * Math.PI) * b.ax) * w,
    y: (b.py + Math.cos(t * b.sy * 2 * Math.PI) * b.ay) * h,
    inv: 1 / (b.radius * side) ** 2,
  }));
  let i = 0;
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1 || 1);
    const br = BASE_TOP[0] + (BASE_BOTTOM[0] - BASE_TOP[0]) * v;
    const bg = BASE_TOP[1] + (BASE_BOTTOM[1] - BASE_TOP[1]) * v;
    const bb = BASE_TOP[2] + (BASE_BOTTOM[2] - BASE_TOP[2]) * v;
    const row = (y & 3) << 2;
    for (let x = 0; x < w; x++) {
      const threshold = BAYER4[row + (x & 3)]!;
      let r = br;
      let g = bg;
      let b = bb;
      for (let k = 0; k < blobs.length; k++) {
        const c = centres[k]!;
        const dx = x - c.x;
        const dy = y - c.y;
        const falloff = 1 - (dx * dx + dy * dy) * c.inv;
        if (falloff <= 0) continue;
        // smooth → quantised with ordered dither
        const q = Math.floor(falloff * falloff * AMBIENT_LEVELS + threshold) / AMBIENT_LEVELS;
        if (q <= 0) continue;
        const blob = blobs[k]!;
        const a = q * blob.strength * 0.85;
        r += (blob.color[0] - r) * a;
        g += (blob.color[1] - g) * a;
        b += (blob.color[2] - b) * a;
      }
      data[i++] = r;
      data[i++] = g;
      data[i++] = b;
      data[i++] = 255;
    }
  }
}

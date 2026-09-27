import { hexToRgb, type Palette } from "@/lib/palettes";

/** CSS px per ambient pixel. */
export const AMBIENT_PIXEL = 6;
/** Quantisation steps per blob. */
export const AMBIENT_LEVELS = 5;

/** Ordered-dither Bayer 4×4 thresholds (0..1). */
export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

export interface AmbientBlob {
  color: [number, number, number];
  strength: number;
  /** Fraction of the larger viewport side. */
  radius: number;
  /** Rest position (fraction of the viewport). */
  px: number;
  py: number;
  /** Drift amplitude (fraction of the viewport) — must match the .amb-drift-* keyframes in globals.css. */
  ax: number;
  ay: number;
}

export function ambientBlobs(p: Palette): AmbientBlob[] {
  const amb = hexToRgb(p.ambient);
  const a2 = hexToRgb(p.accent2);
  // ambient hue lifted a little toward accent2 so it reads on the near-black base
  const lifted = [0, 1, 2].map((i) => Math.min(255, amb[i]! * 1.35 + a2[i]! * 0.15)) as [number, number, number];
  return [
    { color: lifted, strength: 1.0, radius: 0.7, px: 0.2, py: 0.15, ax: 0.22, ay: 0.12 },
    { color: a2, strength: 0.55, radius: 0.5, px: 0.85, py: 0.6, ax: 0.2, ay: 0.16 },
    { color: hexToRgb(p.accent), strength: 0.28, radius: 0.36, px: 0.5, py: 0.95, ax: 0.26, ay: 0.2 },
  ];
}

/** Sprite edge length as a fraction of the larger viewport side (diameter). */
export function blobSpriteSize(radius: number): number {
  return 2 * radius;
}

/**
 * Dithered, quantised coverage (0..1) of a blob at an offset from its centre. `inv` = 1 / radius².
 * Same curve as the original per-frame renderer: falloff² quantised to LEVELS with a Bayer threshold.
 */
export function blobCoverage(dx: number, dy: number, inv: number, threshold: number, strength: number): number {
  const falloff = 1 - (dx * dx + dy * dy) * inv;
  if (falloff <= 0) return 0;
  const q = Math.floor(falloff * falloff * AMBIENT_LEVELS + threshold) / AMBIENT_LEVELS;
  return q <= 0 ? 0 : Math.min(1, q * strength * 0.85);
}

/** RGBA pixels of one blob sprite, `size`×`size` ambient pixels. */
export function blobPixels(blob: AmbientBlob, size: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size * size * 4);
  const r = size / 2;
  const inv = 1 / (r * r);
  let i = 0;
  for (let y = 0; y < size; y++) {
    const row = (y & 3) << 2;
    const dy = y + 0.5 - r;
    for (let x = 0; x < size; x++) {
      const a = blobCoverage(x + 0.5 - r, dy, inv, BAYER4[row + (x & 3)]!, blob.strength);
      data[i++] = blob.color[0];
      data[i++] = blob.color[1];
      data[i++] = blob.color[2];
      data[i++] = Math.round(a * 255);
    }
  }
  return data;
}

/** Paints a blob into `canvas` for a viewport whose larger side is `side` ambient pixels. */
export function renderBlobSprite(canvas: HTMLCanvasElement, blob: AmbientBlob, side: number): void {
  const size = Math.max(4, Math.ceil(blobSpriteSize(blob.radius) * side));
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  if (canvas.width !== size) canvas.width = size;
  if (canvas.height !== size) canvas.height = size;
  const image = ctx.createImageData(size, size);
  image.data.set(blobPixels(blob, size));
  ctx.putImageData(image, 0, 0);
}

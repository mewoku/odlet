import { describe, expect, it } from "vitest";
import { PALETTES } from "@/lib/palettes";
import { ambientBlobs, renderAmbient } from "./ambientField";

function image(w: number, h: number): ImageData {
  return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4), colorSpace: "srgb" } as ImageData;
}

describe("renderAmbient", () => {
  const blobs = ambientBlobs(PALETTES.lab);

  it("fills every pixel opaque", () => {
    const img = image(40, 30);
    renderAmbient(img, blobs, 3);
    for (let i = 3; i < img.data.length; i += 4) expect(img.data[i]).toBe(255);
  });

  it("drifts over time", () => {
    const a = image(40, 30);
    const b = image(40, 30);
    renderAmbient(a, blobs, 0);
    renderAmbient(b, blobs, 20);
    expect(Buffer.from(a.data).equals(Buffer.from(b.data))).toBe(false);
  });

  it("is dithered: a flat-looking area mixes at least two colours", () => {
    const img = image(64, 64);
    renderAmbient(img, blobs, 7);
    const colours = new Set<number>();
    for (let i = 0; i < img.data.length; i += 4) colours.add((img.data[i]! << 16) | (img.data[i + 1]! << 8) | img.data[i + 2]!);
    expect(colours.size).toBeGreaterThan(8);
  });
});

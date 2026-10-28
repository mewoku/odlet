import { ImageResponse } from "next/og";

/** Link-preview card in the brand palette: pixel glyph as the hero, terse copy. 1200x630. */
export const OG_SIZE = { width: 1200, height: 630 } as const;

const INK = "#E7E8E5";
const TEAL = "#11C5B3";
const YELLOW = "#E8DA37";
const MUTED = "#536971";

/** A stable 4x4 glyph per number, so every day's card looks different. */
export function glyphMask(n: number): number {
  const mixed = Math.imul(n + 1, 2654435761) >>> 0;
  return (mixed ^ (mixed >>> 15)) & 0xffff || 0x0660;
}

export function ogCard(opts: { kicker: string; title: string; line: string; glyph: number }): ImageResponse {
  const cell = 76;
  const gap = 8;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#090A0C", color: INK, padding: 72, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 560 }}>
          <div style={{ display: "flex", fontSize: 30, letterSpacing: 6, color: TEAL }}>{opts.kicker}</div>
          <div style={{ display: "flex", fontSize: 132, fontWeight: 800, letterSpacing: 4, lineHeight: 1 }}>{opts.title}</div>
          <div style={{ display: "flex", fontSize: 38, color: MUTED, lineHeight: 1.25 }}>{opts.line}</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", width: cell * 4 + gap * 3, gap, padding: 16, background: "#17181C" }}>
          {Array.from({ length: 16 }, (_, i) => (
            <div key={i} style={{ width: cell, height: cell, background: (opts.glyph >> i) & 1 ? (i % 5 === 0 ? YELLOW : TEAL) : "#28292F" }} />
          ))}
        </div>
      </div>
    ),
    OG_SIZE,
  );
}

import { dayNumber } from "@ronriku/core";
import { OG_SIZE, glyphMask, ogCard } from "@/lib/ogCard";

export const alt = "Today's ODLET Daily";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 600; // the day rolls over at 00:00 UTC

export default function Image() {
  const day = dayNumber(new Date());
  return ogCard({
    kicker: `DAILY #${String(day).padStart(3, "0")}`,
    title: "BEAT TODAY",
    line: "Pattern, Spatial, Link. One minute each. Plays right here.",
    glyph: glyphMask(day),
  });
}

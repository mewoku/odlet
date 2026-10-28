import { OG_SIZE, ogCard } from "@/lib/ogCard";

export const alt = "Odlet: pixel reasoning game";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return ogCard({ kicker: "PIXEL REASONING", title: "ODLET", line: "Three trials a day. Same puzzles for everyone.", glyph: 0x6996 });
}

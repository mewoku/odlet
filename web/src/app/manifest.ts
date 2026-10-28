import type { MetadataRoute } from "next";

/** Installable: the home-screen icon opens today's Daily, which plays at once. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ODLET",
    short_name: "ODLET",
    description: "Pixel reasoning game. Three trials a day, the same puzzles for everyone.",
    start_url: "/daily/play",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#090A0C",
    theme_color: "#07080B",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
    shortcuts: [
      { name: "Today's Daily", short_name: "Daily", url: "/daily/play" },
      { name: "Play the full game", short_name: "Play", url: "/play" },
    ],
  };
}

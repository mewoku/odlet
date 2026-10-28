import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("web manifest", () => {
  const m = manifest();

  it("opens today's Daily and stays in scope", () => {
    expect(m.start_url).toBe("/daily/play");
    expect(m.scope).toBe("/");
    expect(m.display).toBe("standalone");
  });

  it("ships a 512 px icon and only same-origin paths", () => {
    expect(m.icons?.some((i) => i.sizes === "512x512")).toBe(true);
    for (const i of m.icons ?? []) expect(i.src.startsWith("/")).toBe(true);
    for (const s of m.shortcuts ?? []) expect(s.url.startsWith("/")).toBe(true);
  });
});

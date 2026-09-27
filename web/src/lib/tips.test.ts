import { describe, expect, it } from "vitest";
import { TIPS } from "./tips";

describe("loading tips", () => {
  it("has short, unique tips that fit the loading screen", () => {
    expect(TIPS.length).toBeGreaterThanOrEqual(6);
    expect(new Set(TIPS).size).toBe(TIPS.length);
    for (const t of TIPS) expect(t.length).toBeLessThanOrEqual(80);
  });
});

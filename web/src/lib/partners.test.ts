import { describe, expect, it } from "vitest";
import { BUILT_WITH, PARTNERS, visiblePartners } from "./partners";
import { safeUrl } from "./env";

describe("partners", () => {
  it("ships with no claimed partnerships", () => {
    expect(PARTNERS).toHaveLength(0);
    expect(visiblePartners()).toEqual([]);
    expect(BUILT_WITH.map((b) => b.name)).toContain("Solana");
  });

  it("keeps only well-formed entries with local logos", () => {
    const out = visiblePartners([
      { name: "Good", url: "https://example.com", logo: "/partners/good.svg" },
      { name: "", url: "https://example.com" },
      { name: "Script", url: "javascript:alert(1)" },
      { name: "Hotlink", url: "https://example.com", logo: "https://cdn.example.com/x.png" },
      { name: "Protocol-relative", url: "https://example.com", logo: "//cdn.example.com/x.png" },
      { name: "Relative", url: "/about" },
    ]);
    expect(out.map((p) => p.name)).toEqual(["Good"]);
  });
});

describe("safeUrl", () => {
  it("accepts only absolute http(s) URLs", () => {
    expect(safeUrl("https://x.com/odlet")).toBe("https://x.com/odlet");
    expect(safeUrl(" ")).toBe("");
    expect(safeUrl(undefined)).toBe("");
    expect(safeUrl("javascript:alert(1)")).toBe("");
    expect(safeUrl("discord.gg/abc")).toBe("");
  });
});

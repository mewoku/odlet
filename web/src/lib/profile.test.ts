import { describe, expect, it } from "vitest";
import {
  XP,
  dailyFromRows,
  levelFromXp,
  memberSince,
  profileUrl,
  ratingTier,
  totals,
  worldsFromLevels,
  worldsFromSummary,
  xpFor,
  xpToNext,
} from "./profile";

describe("levels / XP", () => {
  it("starts at level 1 and uses a 100, 150, 200 … curve", () => {
    expect(xpToNext(1)).toBe(100);
    expect(xpToNext(2)).toBe(150);
    expect(levelFromXp(0)).toEqual({ level: 1, into: 0, need: 100, progress: 0 });
    expect(levelFromXp(99).level).toBe(1);
    expect(levelFromXp(100)).toEqual({ level: 2, into: 0, need: 150, progress: 0 });
    expect(levelFromXp(325)).toMatchObject({ level: 3, into: 75, need: 200, progress: 0.375 });
  });

  it("is robust to junk input", () => {
    expect(levelFromXp(-50).level).toBe(1);
    expect(levelFromXp(Number.NaN).level).toBe(1);
    expect(levelFromXp(1e12).level).toBe(99);
  });

  it("derives XP from clears, stars, bosses and Dailies only", () => {
    const t = { cleared: 12, stars: 30, bosses: 1 };
    expect(xpFor(t, 4)).toBe(12 * XP.levelClear + 30 * XP.star + XP.bossClear + 4 * XP.daily);
    expect(xpFor({ cleared: 0, stars: 0, bosses: 0 }, -3)).toBe(0);
  });
});

describe("rating tiers", () => {
  it("maps ratings to tiers with the next threshold", () => {
    expect(ratingTier(100)).toMatchObject({ name: "Rookie", next: 1100 });
    expect(ratingTier(1200)).toMatchObject({ name: "Bronze", next: 1300 });
    expect(ratingTier(1500).name).toBe("Gold");
    expect(ratingTier(1899).name).toBe("Platinum");
    expect(ratingTier(3000)).toMatchObject({ name: "Master", next: null });
    expect(ratingTier(Number.NaN).name).toBe("Rookie");
  });
});

describe("adventure progress", () => {
  it("summarises own level rows per world, ignoring invalid and duplicate rows", () => {
    const worlds = worldsFromLevels([
      { world: 0, level: 0, stars: 3 },
      { world: 0, level: 1, stars: 2 },
      { world: 0, level: 1, stars: 3 }, // duplicate key
      { world: 0, level: 11, stars: 1 },
      { world: 2, level: 4, stars: 9 }, // clamped to 3
      { world: 7, level: 0, stars: 3 }, // bad world
      { world: 1, level: 12, stars: 3 }, // bad level
    ]);
    expect(worlds).toHaveLength(5);
    expect(worlds[0]).toMatchObject({ name: "LAB", cleared: 3, stars: 6, boss: true });
    expect(worlds[2]).toMatchObject({ name: "EMBER", cleared: 1, stars: 3, boss: false });
    expect(worlds[1]!.cleared).toBe(0);
    expect(totals(worlds)).toEqual({ cleared: 4, stars: 9, bosses: 1 });
  });

  it("reads RPC summaries defensively", () => {
    const worlds = worldsFromSummary([
      { world: 1, cleared: 40, stars: 200, boss: true },
      { world: "x", cleared: 1 },
      null,
    ]);
    expect(worlds[1]).toMatchObject({ cleared: 12, stars: 36, boss: true });
    expect(worldsFromSummary("nope").every((w) => w.cleared === 0)).toBe(true);
  });

  it("orders Daily history newest first", () => {
    const d = dailyFromRows([
      { day: 3, solved: 2, points: 410, rating_after: 1215 },
      { day: 5, solved: 5, points: -1, rating_after: null },
      { day: "bad" },
    ]);
    expect(d).toEqual([
      { day: 5, solved: 3, points: 0, ratingAfter: null },
      { day: 3, solved: 2, points: 410, ratingAfter: 1215 },
    ]);
    expect(dailyFromRows(undefined)).toEqual([]);
  });
});

describe("links and dates", () => {
  it("builds a canonical profile URL", () => {
    expect(profileUrl("https://odlet.xyz/", "Pixel_Cat")).toBe("https://odlet.xyz/u/Pixel_Cat");
  });

  it("formats member-since in UTC", () => {
    expect(memberSince("2026-09-01T00:30:00Z")).toBe("Sep 2026");
    expect(memberSince(null)).toBeNull();
    expect(memberSince("garbage")).toBeNull();
  });
});

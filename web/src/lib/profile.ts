/**
 * Pure profile maths: XP / player level, rating tiers, adventure progress per world, share links.
 * XP is derived from progress the server already records (no separate XP column), so every viewer
 * computes the same level from the same public stats (profile_stats RPC).
 */
import { WORLD_PALETTES, type PaletteName } from "./palettes";

export const WORLD_COUNT = 5;
export const LEVELS_PER_WORLD = 12;
export const STARS_PER_LEVEL = 3;
export const BOSS_LEVEL = LEVELS_PER_WORLD - 1;

/** XP per recorded achievement. Shards and bought figures deliberately give no XP (no pay-to-level). */
export const XP = {
  levelClear: 50,
  star: 15,
  bossClear: 150,
  daily: 80,
} as const;

export interface WorldProgress {
  world: number;
  name: string;
  palette: PaletteName;
  cleared: number;
  stars: number;
  boss: boolean;
}

export interface DailyEntry {
  day: number;
  solved: number;
  points: number;
  ratingAfter: number | null;
}

/**
 * - "full": adventure + Daily history (profile_stats RPC, or your own rows).
 * - "public": only the public profile columns (someone else's profile without the RPC deployed).
 */
export type StatsScope = "full" | "public";

export interface ProfileStats {
  scope: StatsScope;
  worlds: WorldProgress[];
  daily: DailyEntry[];
  completedDailies: number;
  figures: number | null;
}

const clampInt = (v: unknown, lo: number, hi: number): number => {
  const n = typeof v === "number" ? v : typeof v === "string" && v !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.trunc(n))) : lo;
};

function emptyWorld(world: number): WorldProgress {
  const w = WORLD_PALETTES[world]!;
  return { world, name: w.name, palette: w.palette, cleared: 0, stars: 0, boss: false };
}

/** Per-level rows (your own level_progress) → five world summaries. Invalid rows are ignored. */
export function worldsFromLevels(rows: readonly { world?: unknown; level?: unknown; stars?: unknown }[]): WorldProgress[] {
  const worlds = Array.from({ length: WORLD_COUNT }, (_, i) => emptyWorld(i));
  const seen = new Set<string>();
  for (const r of rows) {
    const world = Number(r.world);
    const level = Number(r.level);
    if (!Number.isInteger(world) || world < 0 || world >= WORLD_COUNT) continue;
    if (!Number.isInteger(level) || level < 0 || level >= LEVELS_PER_WORLD) continue;
    const key = `${world}:${level}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const w = worlds[world]!;
    w.cleared += 1;
    w.stars += clampInt(r.stars, 1, STARS_PER_LEVEL);
    if (level === BOSS_LEVEL) w.boss = true;
  }
  return worlds;
}

/** profile_stats().worlds (aggregates) → five world summaries, clamped to what the map allows. */
export function worldsFromSummary(rows: unknown): WorldProgress[] {
  const worlds = Array.from({ length: WORLD_COUNT }, (_, i) => emptyWorld(i));
  if (!Array.isArray(rows)) return worlds;
  for (const r of rows as Record<string, unknown>[]) {
    const world = Number(r?.world);
    if (!Number.isInteger(world) || world < 0 || world >= WORLD_COUNT) continue;
    const w = worlds[world]!;
    w.cleared = clampInt(r.cleared, 0, LEVELS_PER_WORLD);
    w.stars = clampInt(r.stars, 0, LEVELS_PER_WORLD * STARS_PER_LEVEL);
    w.boss = r.boss === true;
  }
  return worlds;
}

export function dailyFromRows(rows: unknown): DailyEntry[] {
  if (!Array.isArray(rows)) return [];
  return (rows as Record<string, unknown>[])
    .filter((r) => r && Number.isFinite(Number(r.day)))
    .map((r) => ({
      day: Math.trunc(Number(r.day)),
      solved: clampInt(r.solved, 0, 3),
      points: clampInt(r.points, 0, 1_000_000),
      ratingAfter: r.rating_after == null ? null : clampInt(r.rating_after, 0, 5000),
    }))
    .sort((a, b) => b.day - a.day);
}

export interface Totals {
  cleared: number;
  stars: number;
  bosses: number;
}

export function totals(worlds: readonly WorldProgress[]): Totals {
  return worlds.reduce((t, w) => ({ cleared: t.cleared + w.cleared, stars: t.stars + w.stars, bosses: t.bosses + (w.boss ? 1 : 0) }), {
    cleared: 0,
    stars: 0,
    bosses: 0,
  });
}

export function xpFor(t: Totals, completedDailies: number): number {
  return t.cleared * XP.levelClear + t.stars * XP.star + t.bosses * XP.bossClear + Math.max(0, completedDailies) * XP.daily;
}

/** XP needed to go from `level` to `level + 1`: 100, 150, 200, … */
export function xpToNext(level: number): number {
  return 100 + 50 * (Math.max(1, level) - 1);
}

export interface LevelInfo {
  level: number;
  /** XP earned inside the current level. */
  into: number;
  /** XP the current level needs in total. */
  need: number;
  /** 0..1 */
  progress: number;
}

export function levelFromXp(xp: number): LevelInfo {
  let level = 1;
  let rest = Math.max(0, Math.floor(Number.isFinite(xp) ? xp : 0));
  while (level < 99 && rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level += 1;
  }
  const need = xpToNext(level);
  return { level, into: Math.min(rest, need), need, progress: Math.min(1, rest / need) };
}

export interface RatingTier {
  name: string;
  color: string;
  min: number;
  /** Rating where the next tier starts, null at the top. */
  next: number | null;
}

const TIERS: readonly Omit<RatingTier, "next">[] = [
  { name: "Rookie", color: "#8A94A6", min: 0 },
  { name: "Bronze", color: "#D08A4E", min: 1100 },
  { name: "Silver", color: "#C7D0DB", min: 1300 },
  { name: "Gold", color: "#FFC83D", min: 1500 },
  { name: "Platinum", color: "#8FE3FF", min: 1700 },
  { name: "Diamond", color: "#FF4FD8", min: 1900 },
  { name: "Master", color: "#11C5B3", min: 2200 },
];

export function ratingTier(rating: number): RatingTier {
  const r = Number.isFinite(rating) ? rating : 0;
  let i = 0;
  while (i + 1 < TIERS.length && r >= TIERS[i + 1]!.min) i++;
  return { ...TIERS[i]!, next: TIERS[i + 1]?.min ?? null };
}

/** Canonical, shareable profile URL. */
export function profileUrl(siteUrl: string, handle: string): string {
  return `${siteUrl.replace(/\/$/, "")}/u/${encodeURIComponent(handle)}`;
}

/** "Sep 2026" (UTC, so server and client render the same text). Null for missing/invalid dates. */
export function memberSince(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

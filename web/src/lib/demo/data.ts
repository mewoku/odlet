/**
 * Clearly-labelled DEMO data shown when the Supabase backend is not reachable. Every screen that
 * renders this must show <DemoBadge/>. Figures are real generator outputs (C# fixtures); the
 * handles, ratings and prices around them are placeholders.
 */
import { DEMO_FIGURES } from "./figures";
import type { FigureRecord, FriendRow, LeaderboardRow, LeaderboardScope, Listing, Profile, Rarity, Tier } from "../types";
import { WORLD_PALETTES } from "../palettes";
import type { ProfileStats } from "../profile";

const RARITY_PRICE: Record<Rarity, number> = { Common: 350, Rare: 900, Epic: 2400, Legendary: 0 };

export function demoFigureId(seed: string, tier: number): string {
  return `demo-${seed}-${tier}`;
}

export const demoFigures: FigureRecord[] = DEMO_FIGURES.filter((f) => !f.monster).map((f) => ({
  id: demoFigureId(f.seed, f.tier),
  seed: f.seed,
  tier: f.tier as Tier,
  encoding: f.encoding,
  rarity: f.rarity as Rarity,
  name: f.name,
  ownerId: null,
  mintAddress: null,
  createdAt: null,
}));

export const demoMonsters: FigureRecord[] = DEMO_FIGURES.filter((f) => f.monster).map((f) => ({
  id: demoFigureId(f.seed, f.tier),
  seed: f.seed,
  tier: f.tier as Tier,
  encoding: f.encoding,
  rarity: f.rarity as Rarity,
  name: f.name,
  ownerId: null,
  mintAddress: null,
  createdAt: null,
}));

export function findDemoFigure(id: string): FigureRecord | undefined {
  return [...demoFigures, ...demoMonsters].find((f) => f.id === id);
}

const HANDLES = ["demo_kaito", "demo_mira", "demo_voxel", "demo_rin", "demo_tetra", "demo_nori", "demo_hex", "demo_yuki", "demo_orbit", "demo_pix"];

export const demoListings: Listing[] = demoFigures.slice(0, 12).map((figure, i) => {
  const sol = figure.rarity === "Legendary" || i % 5 === 3;
  return {
    id: `demo-listing-${i}`,
    figure,
    sellerHandle: HANDLES[i % HANDLES.length]!,
    priceShards: sol ? null : RARITY_PRICE[figure.rarity] + (i % 3) * 50,
    priceLamports: sol ? (figure.rarity === "Legendary" ? 150_000_000 : 25_000_000 + i * 1_000_000) : null,
    status: "active",
    createdAt: null,
  };
});

export function demoProfile(handle: string): Profile {
  const i = Math.abs([...handle].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % demoFigures.length;
  return {
    id: `demo-${handle}`,
    handle,
    displayName: null,
    avatarFigureId: demoFigures[i]!.id,
    avatarEncoding: demoFigures[i]!.encoding,
    rating: 1200 + (i * 37) % 400,
    shards: 1450,
    streak: 3 + (i % 5),
    bestStreak: 9 + (i % 7),
    completedDailies: 14 + (i % 9),
    walletAddress: null,
    createdAt: null,
  };
}

export function demoCollection(handle: string): FigureRecord[] {
  const start = handle.length % 6;
  return demoFigures.slice(start, start + 6);
}

export function demoLeaderboard(scope: LeaderboardScope): LeaderboardRow[] {
  const offset = { global: 0, daily: 3, friends: 5, boss: 7 }[scope];
  const n = scope === "friends" ? 4 : 10;
  return Array.from({ length: n }, (_, i) => {
    const handle = HANDLES[(i + offset) % HANDLES.length]!;
    const fig = demoFigures[(i * 3 + offset) % demoFigures.length]!;
    return {
      rank: i + 1,
      userId: `demo-${handle}`,
      handle,
      score: scope === "boss" ? 0 : scope === "daily" ? 300 - i * 17 : 1680 - i * 41 - offset * 3,
      elapsedMs: scope === "boss" ? 94_000 + i * 7_300 : null,
      avatarEncoding: fig.encoding,
    };
  });
}

export const demoFriends: FriendRow[] = [
  { userId: "demo-1", handle: "demo_mira", rating: 1422, status: "accepted", avatarEncoding: demoFigures[1]!.encoding },
  { userId: "demo-2", handle: "demo_tetra", rating: 1310, status: "accepted", avatarEncoding: demoFigures[4]!.encoding },
  { userId: "demo-3", handle: "demo_nori", rating: 1275, status: "pending_in", avatarEncoding: demoFigures[7]!.encoding },
  { userId: "demo-4", handle: "demo_hex", rating: 1190, status: "pending_out", avatarEncoding: demoFigures[9]!.encoding },
];

export function demoBossEvents() {
  const now = Date.now();
  const day = 86_400_000;
  return [
    { id: "demo-boss-1", name: "PRISM WARDEN", palette: "pattern", entryShards: 150, entryLamports: 10_000_000, rewardShards: 500, timeLimitMs: 300_000, stages: 3, startsAt: new Date(now - day).toISOString(), endsAt: new Date(now + 5 * day).toISOString() },
    { id: "demo-boss-2", name: "EMBER TYRANT", palette: "link", entryShards: 150, entryLamports: 10_000_000, rewardShards: 800, timeLimitMs: 240_000, stages: 3, startsAt: new Date(now + 6 * day).toISOString(), endsAt: new Date(now + 13 * day).toISOString() },
  ];
}

/** Demo adventure + Daily stats, deterministic per handle (clearly labelled as demo in the UI). */
export function demoProfileStats(handle: string): ProfileStats {
  const h = Math.abs([...handle].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const cleared = [12, 12, 7 + (h % 4), h % 3, 0];
  const worlds = WORLD_PALETTES.map((w, i) => ({
    world: i,
    name: w.name,
    palette: w.palette,
    cleared: cleared[i]!,
    stars: Math.min(cleared[i]! * 3, Math.round(cleared[i]! * (2.2 + ((h >> i) % 5) / 10))),
    boss: cleared[i] === 12,
  }));
  const today = 27;
  const daily = Array.from({ length: 6 }, (_, k) => ({
    day: today - k - (k > 3 ? 1 : 0),
    solved: 3 - ((h >> k) % 3 === 0 ? 1 : 0),
    points: 520 - k * 23 + ((h >> k) % 90),
    ratingAfter: 1260 - k * 9,
  }));
  return { scope: "full", worlds, daily, completedDailies: 14 + (h % 9), figures: null };
}

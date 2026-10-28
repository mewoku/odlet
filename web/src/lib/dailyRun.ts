import type { TrialKind } from "@ronriku/core";

/**
 * Wire shapes for banking a browser-played Daily through `submit_daily`
 * (backend/supabase/migrations/20260924000002_rpc.sql). The server replays every answer, so this module
 * only packs what the player actually did; it never reports a "solved" flag.
 */

/** One finished Daily trial as the in-browser player produced it. */
export interface TrialRun {
  kind: TrialKind;
  ms: number;
  solved: boolean;
  /** Pattern = chosen option index, Spatial = move list (0..3), Logic = cell path; null when skipped. */
  answer: number | readonly number[] | null;
  moves: number;
  /** Pattern has none; Spatial/Logic count restarts (each costs 120 points). */
  resets: number;
}

export interface DailyOutcomeWire {
  kind: TrialKind;
  elapsed_ms: number;
  resets: number;
  moves: number;
  answer: number | number[] | null;
}

/** The server refuses a solve faster than this (`implausible_time`); rounding up can only lower a score. */
export const MIN_SOLVED_MS = 800;
const MAX_MS = 3_600_000;
const MAX_RESETS = 50;
const MAX_MOVES = 100_000;

const clampInt = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(Number.isFinite(v) ? v : 0)));

export function toWireOutcomes(runs: readonly TrialRun[]): DailyOutcomeWire[] {
  return runs.map((r) => ({
    kind: r.kind,
    elapsed_ms: clampInt(r.solved ? Math.max(MIN_SOLVED_MS, r.ms) : r.ms, 0, MAX_MS),
    resets: clampInt(r.resets, 0, MAX_RESETS),
    moves: clampInt(r.moves, 0, MAX_MOVES),
    answer: r.answer === null ? null : typeof r.answer === "number" ? r.answer : [...r.answer],
  }));
}

export interface BankedTrial {
  kind: string;
  solved: boolean;
  elapsedMs: number;
  moves: number;
  par: number;
  resets: number;
  points: number;
}

export interface DailyBank {
  /** False when this account already had a result for the day: the first run stands. */
  counted: boolean;
  day: number;
  solved: number;
  points: number;
  ratingBefore: number;
  ratingAfter: number;
  streak: number;
  shardsEarned: number;
  trials: BankedTrial[];
}

type Row = Record<string, unknown>;
const isRow = (v: unknown): v is Row => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v !== "" && Number.isFinite(Number(v)) ? Number(v) : d);

/** Reads the `submit_daily` JSON reply; throws on anything that is not the documented shape. */
export function parseBank(raw: unknown): DailyBank {
  if (!isRow(raw)) throw new Error("Unexpected reply from the server.");
  const trials = (Array.isArray(raw.outcomes) ? raw.outcomes : []).filter(isRow).map((o) => ({
    kind: String(o.kind ?? ""),
    // Older stored rows carry no per-trial flag; points > 0 means solved (unsolved trials score 0).
    solved: typeof o.solved === "boolean" ? o.solved : num(o.points) > 0,
    elapsedMs: num(o.elapsed_ms),
    moves: num(o.moves),
    par: num(o.par),
    resets: num(o.resets),
    points: num(o.points),
  }));
  return {
    counted: raw.counted === true,
    day: num(raw.day),
    solved: num(raw.solved),
    points: num(raw.points),
    ratingBefore: num(raw.rating_before),
    ratingAfter: num(raw.rating_after),
    streak: num(raw.streak),
    shardsEarned: num(raw.shards_earned),
    trials,
  };
}

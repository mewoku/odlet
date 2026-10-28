import { describe, expect, it } from "vitest";
import { MIN_SOLVED_MS, parseBank, toWireOutcomes, type TrialRun } from "./dailyRun";

const run = (over: Partial<TrialRun>): TrialRun => ({ kind: "Pattern", ms: 5000, solved: true, answer: 2, moves: 1, resets: 0, ...over });

describe("toWireOutcomes", () => {
  it("packs answers in the shapes submit_daily replays", () => {
    const out = toWireOutcomes([
      run({ kind: "Pattern", answer: 3 }),
      run({ kind: "Spatial", answer: [0, 1, 3], moves: 3 }),
      run({ kind: "Logic", answer: [0, 1, 2, 5], moves: 3, resets: 1 }),
    ]);
    expect(out.map((o) => o.kind)).toEqual(["Pattern", "Spatial", "Logic"]);
    expect(out[0]?.answer).toBe(3);
    expect(out[1]?.answer).toEqual([0, 1, 3]);
    expect(out[2]).toMatchObject({ answer: [0, 1, 2, 5], moves: 3, resets: 1 });
  });

  it("sends null for a skipped trial", () => {
    expect(toWireOutcomes([run({ solved: false, answer: null, moves: 0 })])[0]?.answer).toBeNull();
  });

  it("rounds, clamps and raises sub-800 ms solves to the server floor", () => {
    const [fast, slow, wild] = toWireOutcomes([
      run({ ms: 120 }),
      run({ ms: 9_999_999, solved: false, answer: null }),
      run({ ms: 1234.6, resets: 400, moves: -5 }),
    ]);
    expect(fast?.elapsed_ms).toBe(MIN_SOLVED_MS);
    expect(slow?.elapsed_ms).toBe(3_600_000);
    expect(wild).toMatchObject({ elapsed_ms: 1235, resets: 50, moves: 0 });
  });

  it("does not alias the caller's move array", () => {
    const moves = [1, 2];
    const [o] = toWireOutcomes([run({ kind: "Spatial", answer: moves })]);
    moves.push(3);
    expect(o?.answer).toEqual([1, 2]);
  });
});

describe("parseBank", () => {
  const reply = {
    counted: true,
    day: 58,
    challenge_id: "x",
    solved: 2,
    points: 2410,
    rating_before: 1300,
    rating_after: 1318,
    streak: 4,
    shards_earned: 140,
    outcomes: [
      { kind: "Pattern", solved: true, elapsed_ms: 9000, moves: 0, par: 1, resets: 0, points: 1300 },
      { kind: "Spatial", solved: false, elapsed_ms: 90000, moves: 0, par: 3, resets: 0, points: 0 },
    ],
  };

  it("maps the reply to camelCase", () => {
    expect(parseBank(reply)).toMatchObject({
      counted: true,
      day: 58,
      solved: 2,
      points: 2410,
      ratingBefore: 1300,
      ratingAfter: 1318,
      streak: 4,
      shardsEarned: 140,
    });
    expect(parseBank(reply).trials[1]).toMatchObject({ kind: "Spatial", solved: false, points: 0, par: 3 });
  });

  it("reports an already-banked day as not counted", () => {
    expect(parseBank({ ...reply, counted: false, shards_earned: 0 })).toMatchObject({ counted: false, shardsEarned: 0 });
  });

  it("tolerates missing fields and rejects non-objects", () => {
    expect(parseBank({}).trials).toEqual([]);
    expect(() => parseBank(null)).toThrow();
    expect(() => parseBank([1])).toThrow();
  });
});

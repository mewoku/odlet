import { describe, expect, it } from "vitest";
import { admin, dailyOutcomes, newPlayer, rpc, today } from "./helpers.ts";

describe("analytics views", () => {
  it("are closed to players and anonymous clients", async () => {
    const p = await newPlayer();
    for (const view of ["analytics_daily_active", "analytics_retention"]) {
      const res = await p.db.from(view).select("*").limit(1);
      expect(res.error, view).not.toBeNull();
      expect(res.data ?? []).toHaveLength(0);
    }
  });

  it("count today's banked Dailies for the service role", async () => {
    const before = await admin.from("analytics_daily_active").select("players,new_players").eq("day", today()).maybeSingle();
    expect(before.error).toBeNull();
    const p = await newPlayer();
    await rpc(p.db, "submit_daily", { p_day: today(), p_outcomes: dailyOutcomes(today()) });
    const after = await admin.from("analytics_daily_active").select("players,new_players").eq("day", today()).single();
    expect(after.error).toBeNull();
    expect(after.data!.players).toBe((before.data?.players ?? 0) + 1);
    expect(after.data!.new_players).toBe((before.data?.new_players ?? 0) + 1);
  });

  it("report a cohort with unmatured percentages left null", async () => {
    const { data, error } = await admin.from("analytics_retention").select("*").eq("cohort_day", today()).single();
    expect(error).toBeNull();
    expect(data!.players).toBeGreaterThan(0);
    expect(data!.d1_pct).toBeNull();
    expect(data!.d7_pct).toBeNull();
  });
});

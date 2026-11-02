import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BossRow, Claim, PurchaseStore } from "./purchase";

type Row = Record<string, unknown>;

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`${what}: ${error?.message ?? "unknown error"}`);
}

/** PurchaseStore over the service-role Supabase client (bypasses RLS; server only). */
export function supabasePurchaseStore(db: SupabaseClient): PurchaseStore {
  return {
    async linkedWallet(userId) {
      const { data, error } = await db.from("profiles").select("wallet_address").eq("id", userId).maybeSingle();
      if (error) fail("profile", error);
      return data?.wallet_address ? String(data.wallet_address) : null;
    },
    async claimBySignature(signature) {
      const { data, error } = await db.from("transactions").select("user_id,kind,ref_id,lamports").eq("signature", signature).maybeSingle();
      if (error) fail("ledger", error);
      if (!data) return null;
      return { userId: String(data.user_id), kind: String(data.kind), refId: data.ref_id ? String(data.ref_id) : null, lamports: data.lamports == null ? null : Number(data.lamports) } satisfies Claim;
    },
    async insertClaim(signature, c) {
      const { error } = await db.from("transactions").insert({ user_id: c.userId, kind: c.kind, shards_delta: 0, lamports: c.lamports, signature, ref_id: c.refId });
      if (!error) return "ok";
      if (error.code === "23505") return "duplicate";
      fail("ledger insert", error);
    },
    async boss(id) {
      const { data, error } = await db.from("boss_events").select("id,entry_lamports,starts_at,ends_at,stages").eq("id", id).maybeSingle();
      if (error) fail("boss", error);
      if (!data) return null;
      return {
        id: String(data.id),
        entryLamports: Number(data.entry_lamports),
        startsAt: String(data.starts_at),
        endsAt: String(data.ends_at),
        stages: Array.isArray(data.stages) ? data.stages.length : 0,
      } satisfies BossRow;
    },
    async bossKeysPublished(bossId, stages) {
      const { count, error } = await db.from("puzzle_keys").select("stage", { count: "exact", head: true }).eq("source", `boss:${bossId}`).lt("stage", stages);
      if (error) fail("puzzle keys", error);
      return (count ?? 0) >= stages;
    },
    async hasOpenAttempt(userId, bossId) {
      const { count, error } = await db.from("boss_attempts").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("boss_id", bossId).eq("result", "open");
      if (error) fail("attempts", error);
      return (count ?? 0) > 0;
    },
    async attempt(id) {
      const { data, error } = await db.from("boss_attempts").select("id,boss_id,user_id").eq("id", id).maybeSingle();
      if (error) fail("attempt", error);
      return data ? { id: String(data.id), bossId: String(data.boss_id), userId: String(data.user_id) } : null;
    },
    async enterBossSol(userId, bossId, signature, lamports) {
      const { data, error } = await db.rpc("enter_boss_sol", { p_user: userId, p_boss_id: bossId, p_signature: signature, p_lamports: lamports });
      if (error) return { ok: false, error: error.message };
      const row = (Array.isArray(data) ? data[0] : data) as Row | null;
      return row?.id ? { ok: true, attemptId: String(row.id) } : { ok: false, error: "no_attempt_returned" };
    },
  };
}

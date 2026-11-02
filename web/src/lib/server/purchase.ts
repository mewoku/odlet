/**
 * Devnet SOL payments (raid entry), independent of Supabase / Solana so it can be unit tested with
 * an in-memory store and a fake chain (see purchase.test.ts). The Supabase + Solana bindings live in
 * purchaseStore.ts / chain.ts; the transaction layout is documented in lib/solana/purchaseTx.ts.
 *
 * Flow: prepare (server checks everything, builds ONE transaction: payment → recipient + memo,
 * partially signs it) → the buyer's wallet signs, pays the fee and broadcasts → process (server
 * verifies the landed transaction and opens the raid attempt).
 *
 * Invariants:
 *  - The buyer is the caller's *linked* wallet (profiles.wallet_address), never a request field; it
 *    is baked into the prepared transaction as fee payer and cannot be changed without voiding the
 *    server's signature.
 *  - Price comes from the server. The memo, signed by the server purchase authority, binds a
 *    transaction to exactly one (user, kind, ref); a payment signature is consumed exactly once in
 *    the ledger, and a retry with the same signature may only resume that same entry.
 *  - A verified payment that cannot be fulfilled is recorded as `sol_refund_due`.
 *  - The purchase authority never pays: the buyer is fee payer.
 */
import type { PurchaseTxCheck, PurchaseTxExpectation } from "../solana/purchaseTx";

export type PurchaseItem = "boss-entry";

export interface PurchaseRequest {
  item: PurchaseItem;
  bossId?: string;
}

export interface PurchaseBody extends PurchaseRequest {
  signature: string;
}

export const KIND = {
  "boss-entry": "boss_entry", // written by enter_boss_sol (ref_id = attempt id)
} as const;
export const REFUND_KIND = "sol_refund_due";

export interface Claim {
  userId: string;
  kind: string;
  refId: string | null;
  lamports: number | null;
}

export interface BossRow {
  id: string;
  entryLamports: number;
  startsAt: string;
  endsAt: string;
  stages: number;
}

export interface PurchaseStore {
  linkedWallet(userId: string): Promise<string | null>;
  claimBySignature(signature: string): Promise<Claim | null>;
  /** Insert a ledger row carrying the signature; "duplicate" when the signature is already used. */
  insertClaim(signature: string, claim: Claim): Promise<"ok" | "duplicate">;
  boss(id: string): Promise<BossRow | null>;
  bossKeysPublished(bossId: string, stages: number): Promise<boolean>;
  hasOpenAttempt(userId: string, bossId: string): Promise<boolean>;
  attempt(id: string): Promise<{ id: string; bossId: string; userId: string } | null>;
  /** enter_boss_sol: attempt + ledger row in one transaction. */
  enterBossSol(userId: string, bossId: string, signature: string, lamports: number): Promise<{ ok: true; attemptId: string } | { ok: false; error: string }>;
}

export interface ChainDeps {
  /** Server purchase authority public key (co-signs every prepared transaction; holds no SOL). */
  authority: string;
  memo(userId: string, kind: string, ref: string): string;
  /** Build + partially sign the payment transaction. `transaction` is base64 wire format. */
  buildTx(p: { buyer: string; recipient: string; lamports: number; memo: string }): Promise<{ transaction: string; lastValidBlockHeight: number }>;
  verifyTx(signature: string, expected: PurchaseTxExpectation): Promise<PurchaseTxCheck>;
}

export interface PurchaseConfig {
  /** Public payment recipient (NEXT_PUBLIC_PAYMENT_RECIPIENT). */
  recipient: string;
  now: Date;
}

export class PurchaseError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export interface Quote {
  item: PurchaseItem;
  kind: string;
  ref: string;
  lamports: number;
  buyer: string;
}

export interface Prepared {
  transaction: string;
  lastValidBlockHeight: number;
  lamports: number;
  wallet: string;
  recipient: string;
}

export interface PurchaseOutcome {
  attemptId: string;
  resumed: boolean;
}

export function refFor(req: PurchaseRequest): string {
  return `boss:${req.bossId}`;
}

/** Everything that can be checked before any SOL moves (time-sensitive checks included). */
export async function quote(store: PurchaseStore, cfg: PurchaseConfig, userId: string, req: PurchaseRequest): Promise<Quote> {
  const buyer = await store.linkedWallet(userId);
  if (!buyer) throw new PurchaseError("wallet_not_linked", "Link your wallet to your profile before paying with SOL.", 409);
  const boss = await store.boss(req.bossId!);
  if (!boss) throw new PurchaseError("unknown_boss", "Unknown boss event.", 404);
  const t = cfg.now.getTime();
  if (t < new Date(boss.startsAt).getTime() || t > new Date(boss.endsAt).getTime()) throw new PurchaseError("boss_not_active", "This raid is not active.", 410);
  if (!(await store.bossKeysPublished(boss.id, boss.stages))) throw new PurchaseError("puzzle_not_published", "This raid is not ready yet.", 503);
  if (await store.hasOpenAttempt(userId, boss.id)) throw new PurchaseError("attempt_open", "You already have an open attempt for this raid — finish it in the game first.", 409);
  return { item: req.item, kind: KIND[req.item], ref: refFor(req), buyer, lamports: boss.entryLamports };
}

/** Pre-checks, then builds the single partially-signed transaction for the buyer to sign and send. */
export async function prepareSolPurchase(store: PurchaseStore, chain: ChainDeps, cfg: PurchaseConfig, userId: string, req: PurchaseRequest): Promise<Prepared> {
  const q = await quote(store, cfg, userId, req);
  const memo = chain.memo(userId, q.kind, q.ref);
  const built = await chain.buildTx({ buyer: q.buyer, recipient: cfg.recipient, lamports: q.lamports, memo });
  return { ...built, lamports: q.lamports, wallet: q.buyer, recipient: cfg.recipient };
}

async function recordRefundDue(store: PurchaseStore, signature: string, userId: string, kind: string, ref: string, lamports: number, reason: string): Promise<never> {
  const r = await store.insertClaim(signature, { userId, kind: REFUND_KIND, refId: `${kind}|${ref}`, lamports });
  if (r === "duplicate") throw new PurchaseError("signature_used", "This payment was already used.", 409);
  throw new PurchaseError("refund_due", `${reason} Your payment was recorded for a refund (signature ${signature.slice(0, 8)}…).`, 409);
}

export async function processSolPurchase(store: PurchaseStore, chain: ChainDeps, cfg: PurchaseConfig, userId: string, body: PurchaseBody): Promise<PurchaseOutcome> {
  const kind = KIND[body.item];
  const ref = refFor(body);

  // 1) Earlier claim for this signature? It may only resume exactly what it paid for.
  const prior = await store.claimBySignature(body.signature);
  if (prior) return resume(store, userId, body, prior);

  // 2) Verify the landed transaction is the one this server prepared for (user, kind, ref).
  //    No time-sensitive checks here: those ran at prepare.
  const boss = await store.boss(body.bossId!);
  if (!boss) throw new PurchaseError("unknown_boss", "Unknown boss event.", 404);
  const check = await chain.verifyTx(body.signature, {
    memo: chain.memo(userId, kind, ref),
    recipient: cfg.recipient,
    authority: chain.authority,
    minLamports: boss.entryLamports,
  });
  if (!check.ok) throw new PurchaseError("payment_invalid", check.reason, 402);

  // 3) Claim: attempt + ledger row in one database transaction.
  const r = await store.enterBossSol(userId, body.bossId!, body.signature, check.lamports);
  if (r.ok) return { attemptId: r.attemptId, resumed: false };
  if (r.error.includes("signature_used")) throw new PurchaseError("signature_used", "This payment was already used.", 409);
  return recordRefundDue(store, body.signature, userId, kind, ref, check.lamports, `Raid entry failed (${r.error}).`);
}

async function resume(store: PurchaseStore, userId: string, body: PurchaseBody, prior: Claim): Promise<PurchaseOutcome> {
  if (prior.userId !== userId) throw new PurchaseError("signature_used", "This payment was already claimed.", 409);
  if (prior.kind === REFUND_KIND) throw new PurchaseError("refund_due", "This payment is recorded for a refund.", 409);
  if (prior.kind !== KIND["boss-entry"] || !prior.refId) throw new PurchaseError("claim_mismatch", "This payment was for a different item.", 409);
  const att = await store.attempt(prior.refId);
  if (!att || att.bossId !== body.bossId || att.userId !== userId) throw new PurchaseError("claim_mismatch", "This payment was for a different raid.", 409);
  return { attemptId: att.id, resumed: true };
}

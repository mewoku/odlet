import { beforeEach, describe, expect, it } from "vitest";
import {
  REFUND_KIND,
  PurchaseError,
  prepareSolPurchase,
  processSolPurchase,
  quote,
  type ChainDeps,
  type Claim,
  type PurchaseBody,
  type PurchaseConfig,
  type PurchaseRequest,
  type PurchaseStore,
} from "./purchase";
import type { PurchaseTxExpectation } from "../solana/purchaseTx";

// ------------------------------------------------------------------ in-memory fakes
const RECIPIENT = "Recipient11111111111111111111111111111111";
const AUTHORITY = "Authority11111111111111111111111111111111";
const ALICE = "11111111-1111-4111-8111-111111111111";
const BOB = "22222222-2222-4222-8222-222222222222";
const ALICE_WALLET = "AliceWallet111111111111111111111111111111";
const BOB_WALLET = "BobWallet1111111111111111111111111111111111";
const BOSS = "33333333-3333-4333-8333-333333333333";
const BOSS2 = "44444444-4444-4444-8444-444444444444";
const ENTRY = 10_000_000;
const sig = (n: number) => `${n}`.padStart(8, "9") + "S".repeat(80);

class FakeStore implements PurchaseStore {
  wallets = new Map<string, string | null>([
    [ALICE, ALICE_WALLET],
    [BOB, BOB_WALLET],
  ]);
  claims = new Map<string, Claim>();
  bosses = new Map([
    [BOSS, { id: BOSS, entryLamports: ENTRY, startsAt: "2026-09-20T00:00:00Z", endsAt: "2026-09-30T00:00:00Z", stages: 3 }],
    [BOSS2, { id: BOSS2, entryLamports: ENTRY * 2, startsAt: "2026-09-20T00:00:00Z", endsAt: "2026-09-30T00:00:00Z", stages: 3 }],
  ]);
  keysPublished = true;
  attempts = new Map<string, { id: string; bossId: string; userId: string; open: boolean }>();
  enterBossFailure: string | null = null;
  private n = 0;

  async linkedWallet(u: string) {
    return this.wallets.get(u) ?? null;
  }
  async claimBySignature(s: string) {
    return this.claims.get(s) ?? null;
  }
  async insertClaim(s: string, c: Claim) {
    if (this.claims.has(s)) return "duplicate" as const;
    this.claims.set(s, c);
    return "ok" as const;
  }
  async boss(id: string) {
    return this.bosses.get(id) ?? null;
  }
  async bossKeysPublished() {
    return this.keysPublished;
  }
  async hasOpenAttempt(u: string, b: string) {
    return [...this.attempts.values()].some((a) => a.userId === u && a.bossId === b && a.open);
  }
  async attempt(id: string) {
    return this.attempts.get(id) ?? null;
  }
  // Mirrors enter_boss_sol: attempt + ledger atomically (no await inside, like one DB transaction);
  // refuses an open attempt or a used signature.
  async enterBossSol(u: string, b: string, s: string, lamports: number) {
    if (this.enterBossFailure) return { ok: false as const, error: this.enterBossFailure };
    if (this.claims.has(s)) return { ok: false as const, error: "signature_used" };
    if ([...this.attempts.values()].some((a) => a.userId === u && a.bossId === b && a.open)) return { ok: false as const, error: "attempt_open" };
    const id = `att-${++this.n}`;
    this.attempts.set(id, { id, bossId: b, userId: u, open: true });
    this.claims.set(s, { userId: u, kind: "boss_entry", refId: id, lamports });
    return { ok: true as const, attemptId: id };
  }
}

interface Built {
  buyer: string;
  recipient: string;
  lamports: number;
  memo: string;
}
interface Landed {
  feePayer: string;
  recipient: string;
  lamports: number;
  memo: string | null;
  authoritySigned: boolean;
}

/** Simulates the chain: `buildTx` returns the transaction as JSON; `land` is the buyer signing and sending it. */
class FakeChain implements ChainDeps {
  authority = AUTHORITY;
  txs = new Map<string, Landed>();
  builds: Built[] = [];

  memo(u: string, kind: string, ref: string) {
    return `ronriku:v2:${kind}:${ref}:${u}`;
  }
  async buildTx(p: Built) {
    this.builds.push(p);
    return { transaction: JSON.stringify(p), lastValidBlockHeight: 1000 };
  }
  land(signature: string, transaction: string) {
    const b = JSON.parse(transaction) as Built;
    this.txs.set(signature, { feePayer: b.buyer, recipient: b.recipient, lamports: b.lamports, memo: b.memo, authoritySigned: true });
  }
  async verifyTx(signature: string, e: PurchaseTxExpectation) {
    const t = this.txs.get(signature);
    if (!t) return { ok: false as const, reason: "not found" };
    if (!t.authoritySigned || e.authority !== AUTHORITY) return { ok: false as const, reason: "not prepared by this server" };
    if (t.memo !== e.memo) return { ok: false as const, reason: "memo mismatch" };
    if (t.recipient !== e.recipient) return { ok: false as const, reason: "wrong recipient" };
    if (t.lamports < e.minLamports) return { ok: false as const, reason: "too small" };
    return { ok: true as const, lamports: t.lamports, buyer: t.feePayer };
  }
}

const cfg: PurchaseConfig = { recipient: RECIPIENT, now: new Date("2026-09-24T12:00:00Z") };
let store: FakeStore;
let chain: FakeChain;

beforeEach(() => {
  store = new FakeStore();
  chain = new FakeChain();
});

async function expectCode(p: Promise<unknown>, code: string) {
  const e = await p.then(
    () => null,
    (x: unknown) => x,
  );
  expect(e).toBeInstanceOf(PurchaseError);
  expect((e as PurchaseError).code).toBe(code);
  return e as PurchaseError;
}

const BOSSREQ: PurchaseRequest = { item: "boss-entry", bossId: BOSS };
const BOSS2REQ: PurchaseRequest = { item: "boss-entry", bossId: BOSS2 };
const withSig = (r: PurchaseRequest, s: string): PurchaseBody => ({ ...r, signature: s });
const prepare = (u: string, r: PurchaseRequest) => prepareSolPurchase(store, chain, cfg, u, r);
const run = (u: string, b: PurchaseBody) => processSolPurchase(store, chain, cfg, u, b);

/** prepare → buyer signs/sends. */
async function pay(u: string, r: PurchaseRequest, s: string) {
  const p = await prepare(u, r);
  chain.land(s, p.transaction);
  return p;
}

// ------------------------------------------------------------------ tests
describe("prepare: one transaction, buyer pays, server authority only signs", () => {
  it("raid entry: payment to the recipient + memo, server price, linked wallet as buyer", async () => {
    const p = await prepare(ALICE, BOSSREQ);
    expect(p).toMatchObject({ lamports: ENTRY, wallet: ALICE_WALLET, recipient: RECIPIENT });
    expect(chain.builds[0]).toEqual({ buyer: ALICE_WALLET, recipient: RECIPIENT, lamports: ENTRY, memo: chain.memo(ALICE, "boss_entry", `boss:${BOSS}`) });
  });
  it("requires a linked wallet before building anything", async () => {
    store.wallets.set(ALICE, null);
    await expectCode(prepare(ALICE, BOSSREQ), "wallet_not_linked");
    expect(chain.builds).toHaveLength(0);
  });
  it("runs all pre-checks before building", async () => {
    await expectCode(prepare(ALICE, { item: "boss-entry", bossId: "55555555-5555-4555-8555-555555555555" }), "unknown_boss");
    store.attempts.set("open", { id: "open", bossId: BOSS, userId: ALICE, open: true });
    await expectCode(prepare(ALICE, BOSSREQ), "attempt_open");
    expect(chain.builds).toHaveLength(0);
  });
});

describe("happy path", () => {
  it("opens an attempt with the ledger row written atomically", async () => {
    await pay(ALICE, BOSSREQ, sig(3));
    const out = await run(ALICE, withSig(BOSSREQ, sig(3)));
    expect(out).toMatchObject({ resumed: false });
    expect(store.claims.get(sig(3))).toMatchObject({ userId: ALICE, kind: "boss_entry", refId: out.attemptId, lamports: ENTRY });
  });
});

describe("C1: a paid signature is bound to user + kind + ref", () => {
  beforeEach(async () => {
    await pay(ALICE, BOSSREQ, sig(10));
    await run(ALICE, withSig(BOSSREQ, sig(10)));
  });
  it("cannot be reused for another raid", async () => {
    await expectCode(run(ALICE, withSig(BOSS2REQ, sig(10))), "claim_mismatch");
  });
  it("cannot be claimed by another user", async () => {
    await expectCode(run(BOB, withSig(BOSSREQ, sig(10))), "signature_used");
  });
  it("a same-raid retry only resumes", async () => {
    const first = store.claims.get(sig(10))!.refId;
    expect(await run(ALICE, withSig(BOSSREQ, sig(10)))).toEqual({ attemptId: first, resumed: true });
    expect(store.attempts.size).toBe(1);
  });
  it("an unclaimed transaction prepared for one raid cannot be claimed as another (memo)", async () => {
    await pay(ALICE, BOSS2REQ, sig(11));
    await expectCode(run(ALICE, withSig(BOSSREQ, sig(11))), "payment_invalid");
    expect(store.claims.has(sig(11))).toBe(false);
  });
});

describe("C2: only the user the transaction was prepared for can claim it", () => {
  it("rejects a victim's landed payment claimed by someone else", async () => {
    await pay(BOB, BOSSREQ, sig(20));
    await expectCode(run(ALICE, withSig(BOSSREQ, sig(20))), "payment_invalid");
    expect(store.claims.has(sig(20))).toBe(false);
    expect((await run(BOB, withSig(BOSSREQ, sig(20)))).resumed).toBe(false);
  });
  it("rejects a plain transfer the server did not prepare", async () => {
    chain.txs.set(sig(21), { feePayer: ALICE_WALLET, recipient: RECIPIENT, lamports: ENTRY, memo: null, authoritySigned: false });
    await expectCode(run(ALICE, withSig(BOSSREQ, sig(21))), "payment_invalid");
  });
  it("rejects underpayment of the server price (M4)", async () => {
    const p = await prepare(ALICE, BOSSREQ);
    chain.land(sig(22), JSON.stringify({ ...(JSON.parse(p.transaction) as Built), lamports: ENTRY - 1 }));
    await expectCode(run(ALICE, withSig(BOSSREQ, sig(22))), "payment_invalid");
  });
  it("delivery does not depend on the wallet still being linked", async () => {
    await pay(ALICE, BOSSREQ, sig(23));
    store.wallets.set(ALICE, null);
    expect((await run(ALICE, withSig(BOSSREQ, sig(23)))).attemptId).toBeTruthy();
  });
});

describe("H1: raid entry never loses a payment", () => {
  it("pre-checks inactive raids and unpublished keys", async () => {
    await expectCode(quote(store, { ...cfg, now: new Date("2026-10-05T00:00:00Z") }, ALICE, BOSSREQ), "boss_not_active");
    store.keysPublished = false;
    await expectCode(quote(store, cfg, ALICE, BOSSREQ), "puzzle_not_published");
  });
  it("verification has no time-sensitive checks (the raid ended after payment)", async () => {
    await pay(ALICE, BOSSREQ, sig(39));
    const later = { ...cfg, now: new Date("2026-10-05T00:00:00Z") };
    expect((await processSolPurchase(store, chain, later, ALICE, withSig(BOSSREQ, sig(39)))).attemptId).toBeTruthy();
  });
  it("records refund_due when the attempt opened between prepare and payment", async () => {
    await pay(ALICE, BOSSREQ, sig(40));
    store.attempts.set("open", { id: "open", bossId: BOSS, userId: ALICE, open: true });
    await expectCode(run(ALICE, withSig(BOSSREQ, sig(40))), "refund_due");
    expect(store.claims.get(sig(40))).toMatchObject({ userId: ALICE, kind: REFUND_KIND, lamports: ENTRY });
    await expectCode(run(ALICE, withSig(BOSSREQ, sig(40))), "refund_due"); // not claimable afterwards
  });
  it("records refund_due when the RPC fails after payment", async () => {
    await pay(ALICE, BOSSREQ, sig(41));
    store.enterBossFailure = "boss_not_active";
    await expectCode(run(ALICE, withSig(BOSSREQ, sig(41))), "refund_due");
    expect(store.claims.get(sig(41))!.kind).toBe(REFUND_KIND);
  });
  it("does not record anything when there was no valid payment", async () => {
    await expectCode(run(ALICE, withSig(BOSSREQ, sig(42))), "payment_invalid");
    expect(store.claims.size).toBe(0);
  });
});

describe("concurrency", () => {
  it("two verifications of one signature open exactly one attempt", async () => {
    await pay(ALICE, BOSSREQ, sig(70));
    const results = await Promise.allSettled([run(ALICE, withSig(BOSSREQ, sig(70))), run(ALICE, withSig(BOSSREQ, sig(70)))]);
    expect(results.filter((r) => r.status === "fulfilled")).not.toHaveLength(0);
    expect(store.attempts.size).toBe(1);
    expect(store.claims.size).toBe(1);
  });
});

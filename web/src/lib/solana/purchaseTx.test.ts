import { describe, expect, it } from "vitest";
import { Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction, type ParsedTransactionWithMeta } from "@solana/web3.js";
import { buildPurchaseTx, serializePartial, userTag } from "./buildPurchaseTx";
import { checkPurchaseTx, inspectPreparedTx, MEMO_PROGRAM_ID, purchaseMemo } from "./purchaseTx";

const authority = Keypair.generate();
const buyer = Keypair.generate().publicKey.toBase58();
const recipient = Keypair.generate().publicKey.toBase58();
const bossId = "44444444-4444-4444-8444-444444444444";
const memo = purchaseMemo("boss_entry", `boss:${bossId}`, userTag(authority.secretKey, "user-1"));
const blockhash = Keypair.generate().publicKey.toBase58(); // any base58 32 bytes
const MPL_CORE_PROGRAM_ID = "CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d";

function build(lamports = 10_000_000) {
  return buildPurchaseTx({ buyer, recipient, lamports, memo, authority, blockhash, lastValidBlockHeight: 100 });
}
const roundTrip = (tx: Transaction) => Transaction.from(Buffer.from(serializePartial(tx), "base64"));

describe("buildPurchaseTx", () => {
  it("buyer is fee payer and the only unsigned signer; the server authority is pre-signed", () => {
    const tx = roundTrip(build());
    expect(tx.feePayer?.toBase58()).toBe(buyer);
    const sigs = Object.fromEntries(tx.signatures.map((s) => [s.publicKey.toBase58(), !!s.signature]));
    expect(sigs).toEqual({ [buyer]: false, [authority.publicKey.toBase58()]: true });
  });

  it("the authority is never writable, so it can never be charged fees", () => {
    const msg = build().compileMessage();
    const i = msg.accountKeys.findIndex((k) => k.toBase58() === authority.publicKey.toBase58());
    expect(i).toBeGreaterThan(0);
    expect(msg.isAccountWritable(i)).toBe(false);
    expect(msg.accountKeys[0]!.toBase58()).toBe(buyer);
  });

  it("layout: transfer → memo (authority signer), nothing else", () => {
    const tx = build();
    expect(tx.instructions.map((i) => i.programId.toBase58())).toEqual([SystemProgram.programId.toBase58(), MEMO_PROGRAM_ID]);
    expect(Buffer.from(tx.instructions[1]!.data).toString("utf8")).toBe(memo);
  });

  it("user tags are deterministic, secret-dependent and hide the user id", () => {
    const other = Keypair.generate().secretKey;
    expect(userTag(authority.secretKey, "user-1")).toBe(userTag(authority.secretKey, "user-1"));
    expect(userTag(other, "user-1")).not.toBe(userTag(authority.secretKey, "user-1"));
    expect(userTag(authority.secretKey, "user-1")).not.toContain("user-1");
  });
});

describe("inspectPreparedTx (browser, before signing)", () => {
  const exp = { buyer, recipient, lamports: 10_000_000 };
  it("accepts the server's transaction", () => expect(inspectPreparedTx(roundTrip(build()), exp)).toBeNull());
  it("rejects a different price", () => expect(inspectPreparedTx(roundTrip(build(11_000_000)), exp)).toMatch(/charges/));
  it("rejects a different fee payer", () => expect(inspectPreparedTx(roundTrip(build()), { ...exp, buyer: recipient })).toMatch(/fee payer/));
  it("rejects a payment to someone else", () => expect(inspectPreparedTx(roundTrip(build()), { ...exp, recipient: buyer })).toMatch(/wrong account/));
  it("rejects an extra drain transfer", () => {
    const tx = build();
    tx.add(SystemProgram.transfer({ fromPubkey: new PublicKey(buyer), toPubkey: authority.publicKey, lamports: 1 }));
    expect(inspectPreparedTx(tx, exp)).toMatch(/wrong account/);
  });
  it("rejects unknown programs (e.g. token approvals)", () => {
    const tx = build();
    tx.add(new TransactionInstruction({ programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), keys: [], data: Buffer.from([4]) }));
    expect(inspectPreparedTx(tx, exp)).toMatch(/unexpected program/);
  });
  it("rejects Core instructions (e.g. transferring an asset the buyer owns)", () => {
    const tx = build();
    tx.add(new TransactionInstruction({ programId: new PublicKey(MPL_CORE_PROGRAM_ID), keys: [], data: Buffer.from([14]) }));
    expect(inspectPreparedTx(tx, exp)).toMatch(/unexpected program/);
  });
});

describe("checkPurchaseTx (server, after landing)", () => {
  const exp = { memo, recipient, authority: authority.publicKey.toBase58(), minLamports: 10_000_000 };
  type Opts = { err?: boolean; authoritySigner?: boolean; memo?: string; lamports?: number; source?: string; blockTime?: number | null };
  const parsed = (o: Opts = {}) =>
    ({
      blockTime: o.blockTime === undefined ? 1_000_000 : o.blockTime,
      meta: { err: o.err ? { InstructionError: [0, "x"] } : null, innerInstructions: [] },
      transaction: {
        message: {
          accountKeys: [
            { pubkey: new PublicKey(buyer), signer: true, writable: true },
            { pubkey: authority.publicKey, signer: o.authoritySigner ?? true, writable: false },
          ],
          instructions: [
            { programId: SystemProgram.programId, program: "system", parsed: { type: "transfer", info: { source: o.source ?? buyer, destination: recipient, lamports: o.lamports ?? 10_000_000 } } },
            { programId: new PublicKey(MEMO_PROGRAM_ID), program: "spl-memo", parsed: o.memo ?? memo },
          ],
        },
      },
    }) as unknown as ParsedTransactionWithMeta;

  it("accepts the prepared transaction and reports the fee payer as buyer", () => expect(checkPurchaseTx(parsed(), exp)).toEqual({ ok: true, lamports: 10_000_000, buyer }));
  it("accepts old transactions (no age window: memo + one-time ledger prevent replay)", () => expect(checkPurchaseTx(parsed({ blockTime: 1 }), exp).ok).toBe(true));
  it("rejects a missing transaction", () => expect(checkPurchaseTx(null, exp).ok).toBe(false));
  it("rejects a failed transaction", () => expect(checkPurchaseTx(parsed({ err: true }), exp).ok).toBe(false));
  it("rejects a transaction without block time", () => expect(checkPurchaseTx(parsed({ blockTime: null }), exp).ok).toBe(false));
  it("rejects a transaction the server authority did not sign", () => expect(checkPurchaseTx(parsed({ authoritySigner: false }), exp)).toMatchObject({ ok: false, reason: expect.stringMatching(/not prepared/) }));
  it("rejects a memo for another user or item", () => expect(checkPurchaseTx(parsed({ memo: memo.replace("boss:", "bosz:") }), exp)).toMatchObject({ ok: false, reason: expect.stringMatching(/different user or item/) }));
  it("rejects underpayment", () => expect(checkPurchaseTx(parsed({ lamports: 9_999_999 }), exp).ok).toBe(false));
  it("rejects a payment from someone other than the fee payer", () => expect(checkPurchaseTx(parsed({ source: recipient }), exp).ok).toBe(false));
});

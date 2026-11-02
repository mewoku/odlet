/**
 * Builds and partially signs the single payment transaction described in purchaseTx.ts.
 * Server-side (and scripts/devnet-dry-run.ts); holds no secrets itself — the caller passes keypairs.
 */
import { createHmac } from "node:crypto";
import { Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { MEMO_PROGRAM_ID } from "./purchaseTx";

/** Opaque per-user tag for the on-chain memo (does not reveal the Supabase user id). */
export function userTag(secret: Uint8Array, userId: string): string {
  return createHmac("sha256", Buffer.from(secret)).update(`ronriku:user-tag:v1:${userId}`).digest("hex").slice(0, 16);
}

export interface BuildPurchaseTx {
  buyer: string;
  recipient: string;
  lamports: number;
  memo: string;
  authority: Keypair;
  blockhash: string;
  lastValidBlockHeight: number;
}

/** Transfer + authority-signed memo, fee payer = buyer, partially signed by the server. */
export function buildPurchaseTx(o: BuildPurchaseTx): Transaction {
  const buyer = new PublicKey(o.buyer);
  const tx = new Transaction({ feePayer: buyer, blockhash: o.blockhash, lastValidBlockHeight: o.lastValidBlockHeight });
  tx.add(SystemProgram.transfer({ fromPubkey: buyer, toPubkey: new PublicKey(o.recipient), lamports: o.lamports }));
  tx.add(
    new TransactionInstruction({
      programId: new PublicKey(MEMO_PROGRAM_ID),
      keys: [{ pubkey: o.authority.publicKey, isSigner: true, isWritable: false }],
      data: Buffer.from(o.memo, "utf8"),
    }),
  );
  tx.partialSign(o.authority);
  return tx;
}

export function serializePartial(tx: Transaction): string {
  return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");
}

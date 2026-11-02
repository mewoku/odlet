import "server-only";

import { Keypair } from "@solana/web3.js";
import type { ChainDeps } from "./purchase";
import { devnetConnection, PAYMENT_COMMITMENT } from "./solana";
import { buildPurchaseTx, serializePartial, userTag } from "../solana/buildPurchaseTx";
import { checkPurchaseTx, purchaseMemo } from "../solana/purchaseTx";

/**
 * web3.js bindings for SOL payments. The purchase authority only *signs* the memo; the buyer pays
 * every fee, so the authority needs no SOL.
 */
export function solanaChain(authoritySecret: Uint8Array): ChainDeps {
  const authority = Keypair.fromSecretKey(authoritySecret);
  const connection = devnetConnection();
  return {
    authority: authority.publicKey.toBase58(),
    memo: (userId, kind, ref) => purchaseMemo(kind, ref, userTag(authoritySecret, userId)),
    async buildTx({ buyer, recipient, lamports, memo }) {
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(PAYMENT_COMMITMENT);
      const tx = buildPurchaseTx({ buyer, recipient, lamports, memo, authority, blockhash, lastValidBlockHeight });
      return { transaction: serializePartial(tx), lastValidBlockHeight };
    },
    async verifyTx(signature, expected) {
      const tx = await connection.getParsedTransaction(signature, { commitment: PAYMENT_COMMITMENT, maxSupportedTransactionVersion: 0 });
      return checkPurchaseTx(tx, expected);
    },
  };
}

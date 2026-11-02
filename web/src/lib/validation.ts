import { z } from "zod";

// No `new Function` JIT: our page CSP has no 'unsafe-eval', and zod's eval probe otherwise logs a
// CSP violation in Firefox on every page that ships a schema to the browser.
z.config({ jitless: true });

/** base58 alphabet (no 0, O, I, l). */
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;

export const base58PubkeySchema = z
  .string()
  .min(32)
  .max(44)
  .regex(BASE58, "Must be a base58 public key.");

/** Solana transaction signatures are 64 bytes → 86–88 base58 chars. */
export const txSignatureSchema = z.string().min(64).max(88).regex(BASE58, "Must be a base58 signature.");

export const uuidSchema = z.uuid();

/** Figure ids: real uuids from the `figures` table, or `demo-<seed>-<tier>` for demo fixtures. */
export const figureIdSchema = z.union([uuidSchema, z.string().regex(/^demo-\d{1,19}-[345]$/)]);

export const handleSchema = z
  .string()
  .trim()
  .min(3, "3–20 characters.")
  .max(20, "3–20 characters.")
  .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers and _ only.");

const purchaseFields = {
  item: z.enum(["boss-entry"]),
  /** Required for boss-entry. */
  bossId: uuidSchema.optional(),
};

type PurchaseShape = { item: string; bossId?: string };
function refsPresent<T extends z.ZodType<PurchaseShape>>(schema: T) {
  return schema
    .refine((b) => b.item !== "boss-entry" || !!b.bossId, { message: "bossId is required for boss-entry.", path: ["bossId"] });
}

/**
 * POST body. There is deliberately no buyer field: the paying wallet is always the caller's
 * linked wallet (profiles.wallet_address), so nobody can claim someone else's transfer.
 */
export const purchaseSolBodySchema = refsPresent(z.object({ ...purchaseFields, signature: txSignatureSchema }).strict());
export type PurchaseSolBody = z.infer<typeof purchaseSolBodySchema>;

/** POST /api/purchase/sol/prepare body: the item only (price, buyer and recipient come from the server). */
export const purchasePrepareSchema = refsPresent(z.object(purchaseFields).strict());

/** GET quote query (pre-payment checks). */
export const purchaseQuoteSchema = refsPresent(z.object(purchaseFields).strict());

export function zodMessage(err: z.ZodError): string {
  return err.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
}

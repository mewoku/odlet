/**
 * NEXT_PUBLIC_SUPABASE_URL=same-origin: the Supabase API is reverse-proxied under this site's own
 * origin (deploy/Caddyfile), so the browser uses window.location.origin and one image works on any
 * domain. Server code then needs SUPABASE_INTERNAL_URL (lib/server/env.ts).
 */
export const SAME_ORIGIN = "same-origin";

function browserSupabaseUrl(raw: string): string {
  if (raw !== SAME_ORIGIN) return raw;
  return typeof window === "undefined" ? "" : window.location.origin;
}

/** Only absolute http(s) URLs pass (no javascript: or relative junk from a mistyped env var). */
export function safeUrl(raw: string | undefined): string {
  const v = (raw ?? "").trim();
  if (!v) return "";
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "";
  } catch {
    return "";
  }
}

/** Public runtime config (inlined into the client bundle by Next). Server secrets live in lib/server/env.ts. */
export const publicEnv = {
  supabaseUrl: browserSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""),
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  solanaRpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com",
  /** Wallet that receives SOL payments (public address; its secret key never touches this server). */
  paymentRecipient: process.env.NEXT_PUBLIC_PAYMENT_RECIPIENT ?? "",
  /** Canonical public origin (metadataBase, on-chain NFT metadata URIs). Set it to http://localhost:3000 in dev. */
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "https://odlet.xyz").replace(/\/$/, ""),
  /** Public support / privacy contact shown on /privacy and /terms (store listings require one). */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
  /** Community links for the footer; each is rendered only when set to an http(s) URL. */
  social: {
    x: safeUrl(process.env.NEXT_PUBLIC_X_URL),
    discord: safeUrl(process.env.NEXT_PUBLIC_DISCORD_URL),
    telegram: safeUrl(process.env.NEXT_PUBLIC_TELEGRAM_URL),
  },
  /**
   * Marketplace and every SOL purchase (figures, boss entry, mint fee). Off until mainnet launch:
   * NEXT_PUBLIC_MARKET_OPEN=true turns it on. The API routes enforce the same flag server-side.
   */
  marketOpen: process.env.NEXT_PUBLIC_MARKET_OPEN === "true",
} as const;

export const SOLANA_CLUSTER = "devnet" as const;

export function supabaseConfigured(): boolean {
  return !!publicEnv.supabaseUrl && !!publicEnv.supabaseAnonKey;
}

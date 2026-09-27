/**
 * Official partners shown on the landing page ("Partners" row). EMPTY on purpose: Odlet has no
 * official partnerships yet, and the row renders only when this list is non-empty. Add an entry only
 * with a signed agreement / written permission to use the name and logo.
 *
 * logo: optional path under web/public (e.g. "/partners/acme.svg"), self-hosted — never hotlinked.
 */
export interface Partner {
  name: string;
  url: string;
  logo?: string;
  /** Short role, e.g. "Launch partner". */
  note?: string;
}

export const PARTNERS: readonly Partner[] = [];

/**
 * Technology the game is built with. These are NOT partnerships or endorsements; they render as
 * plain monochrome text badges (no third-party logos).
 */
export const BUILT_WITH: readonly { name: string; role: string }[] = [
  { name: "Solana", role: "Collectibles on devnet" },
  { name: "Solana Mobile", role: "Seeker dApp Store (coming soon)" },
  { name: "Metaplex", role: "Core NFT standard" },
  { name: "Supabase", role: "Open-source backend stack" },
  { name: "Unity", role: "Game engine" },
];

/** Only entries with a name and an absolute http(s) URL (and a local logo path, if any) are shown. */
export function visiblePartners(list: readonly Partner[] = PARTNERS): Partner[] {
  return list.filter((p) => {
    if (!p.name.trim()) return false;
    try {
      const u = new URL(p.url);
      if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    } catch {
      return false;
    }
    return !p.logo || (p.logo.startsWith("/") && !p.logo.startsWith("//"));
  });
}

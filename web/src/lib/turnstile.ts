/**
 * Cloudflare Turnstile site key (public by design: it ships in the page). Override with
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY. Outside production the Cloudflare "always passes" test key is used,
 * so local dev works without the real widget (pair it with the test secret on the server).
 */
/** Widget "ODLET waitlist" (Cloudflare account "dev"), hostname odlet.xyz, managed mode. */
const PROD_SITE_KEY = "0x4AAAAAAFTCBxI9jI6Cr1VV";
const TEST_SITE_KEY = "1x00000000000000000000AA";

export const turnstileSiteKey: string =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || (process.env.NODE_ENV === "production" ? PROD_SITE_KEY : TEST_SITE_KEY);

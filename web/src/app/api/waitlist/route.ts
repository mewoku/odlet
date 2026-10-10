import type { NextRequest } from "next/server";
import { z } from "zod";
import { clientKey, TokenBucket } from "@/lib/server/rateLimit";
import { json, limited, readJson } from "@/lib/server/purchaseHttp";
import { getServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEST_SECRET = "1x0000000000000000000000000000000AA";
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Turnstile is the real gate; this only stops one client hammering the verify endpoint.
const limiter = new TokenBucket(process.env.TRUSTED_PROXY === "1" ? 5 : 60, process.env.TRUSTED_PROXY === "1" ? 1 / 30 : 1);

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  token: z.string().min(1).max(2048),
  source: z.string().max(32).regex(/^[a-z0-9_-]*$/).optional(),
});

function turnstileSecret(): string | null {
  return process.env.TURNSTILE_SECRET_KEY || (process.env.NODE_ENV === "production" ? null : TEST_SECRET);
}

async function verifyTurnstile(token: string, secret: string, ip: string | null): Promise<boolean> {
  const form = new URLSearchParams({ secret, response: token });
  if (ip) form.set("remoteip", ip);
  try {
    const res = await fetch(VERIFY_URL, { method: "POST", body: form, signal: AbortSignal.timeout(8000) });
    const out = (await res.json()) as { success?: boolean; hostname?: string };
    return out.success === true;
  } catch (e) {
    console.error("turnstile verify failed", e);
    return false;
  }
}

/** POST { email, token, source? } → { ok: true } (also when the address is already on the list). */
export async function POST(req: NextRequest) {
  const rl = limiter.take(clientKey(req.headers));
  if (!rl.ok) return limited(rl);

  const secret = turnstileSecret();
  const db = getServiceSupabase();
  if (!secret || !db) return json({ ok: false, error: "The waitlist is not open yet." }, 503);

  const raw = await readJson(req);
  if (!raw.ok) return json({ ok: false, error: raw.error }, raw.status);
  const parsed = bodySchema.safeParse(raw.value);
  if (!parsed.success) return json({ ok: false, error: "Enter a valid email address." }, 400);
  const { email, token, source } = parsed.data;

  const ip = req.headers.get("cf-connecting-ip");
  if (!(await verifyTurnstile(token, secret, ip))) return json({ ok: false, error: "Captcha check failed. Try again." }, 400);

  const { error } = await db.from("waitlist").upsert({ email, source: source || "web" }, { onConflict: "email", ignoreDuplicates: true });
  if (error) {
    console.error("waitlist insert failed", error);
    return json({ ok: false, error: "Could not save that. Try again in a minute." }, 500);
  }
  return json({ ok: true });
}

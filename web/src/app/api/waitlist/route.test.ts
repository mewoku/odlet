import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const upsert = vi.fn();
let dbConfigured = true;
vi.mock("@/lib/supabase/server", () => ({
  getServiceSupabase: () => (dbConfigured ? { from: () => ({ upsert }) } : null),
}));

const { POST } = await import("./route");

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.7" },
      body: JSON.stringify(body),
    }),
  );
}

function captcha(success: boolean) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success })));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("POST /api/waitlist", () => {
  beforeEach(() => {
    dbConfigured = true;
    upsert.mockReset().mockResolvedValue({ error: null });
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret-for-tests");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("saves a lower-cased address after the captcha passes", async () => {
    const fetchMock = captcha(true);
    const res = await post({ email: "  Player@Example.COM ", token: "tok", source: "landing" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(upsert).toHaveBeenCalledWith({ email: "player@example.com", source: "landing" }, { onConflict: "email", ignoreDuplicates: true });
    const form = (fetchMock.mock.calls[0] as unknown as [string, { body: URLSearchParams }])[1].body;
    expect(form.get("secret")).toBe("secret-for-tests");
    expect(form.get("response")).toBe("tok");
    expect(form.get("remoteip")).toBe("203.0.113.7");
  });

  it("rejects a failed captcha without touching the database", async () => {
    captcha(false);
    const res = await post({ email: "a@b.co", token: "bad" });
    expect(res.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it.each([
    ["missing token", { email: "a@b.co" }],
    ["not an email", { email: "nope", token: "t" }],
    ["bad source", { email: "a@b.co", token: "t", source: "<script>" }],
  ])("400 on %s", async (_name, body) => {
    const fetchMock = captcha(true);
    expect((await post(body)).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("503 when the database is not configured", async () => {
    dbConfigured = false;
    captcha(true);
    expect((await post({ email: "a@b.co", token: "t" })).status).toBe(503);
  });

  it("500 when the insert fails", async () => {
    captcha(true);
    upsert.mockResolvedValue({ error: { message: "boom" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await post({ email: "a@b.co", token: "t" })).status).toBe(500);
  });
});

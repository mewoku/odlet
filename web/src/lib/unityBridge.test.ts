import { describe, expect, it } from "vitest";
import { encodeHostSession } from "./unityBridge";

describe("encodeHostSession", () => {
  it("writes the three fields Unity's Session class reads", () => {
    const json = encodeHostSession({ access_token: "tok", expires_at: 1_900_000_000, user: { id: "u-1" } });
    expect(JSON.parse(json)).toEqual({ access_token: "tok", expires_at: 1_900_000_000, user_id: "u-1" });
  });

  it("never carries a refresh token", () => {
    const json = encodeHostSession({ access_token: "t", user: { id: "u" }, ...{ refresh_token: "secret" } });
    expect(json).not.toContain("refresh");
    expect(json).not.toContain("secret");
  });

  it("is empty when signed out", () => {
    expect(encodeHostSession(null)).toBe("");
  });
});

"use client";

import { backendReachable, currentUserId, signInAsGuest } from "./api";
import { getBrowserSupabase } from "./supabase/client";

/**
 * Hands the site's Supabase session to the Unity WebGL build so the game and the rest of the site
 * (instant Daily, market, ranks) are one account. Unity reads `window.__odletSession` through
 * Plugins/WebGL/OdletHost.jslib and uses the access token as-is; it never refreshes it, because two
 * refreshers on one refresh token would revoke each other. supabase-js in this page keeps it fresh and
 * every refresh lands here through onAuthStateChange.
 */
declare global {
  interface Window {
    __odletSession?: string;
  }
}

interface HostSessionLike {
  access_token: string;
  expires_at?: number;
  user: { id: string };
}

/** JSON in the shape SupabaseClient.AdoptHostSession parses; "" means signed out. */
export function encodeHostSession(s: HostSessionLike | null): string {
  return s ? JSON.stringify({ access_token: s.access_token, expires_at: s.expires_at ?? 0, user_id: s.user.id }) : "";
}

/** Starts publishing the session (and makes sure a guest exists) while the game downloads. Returns a stop function. */
export function startUnitySessionBridge(): () => void {
  const client = getBrowserSupabase();
  if (!client) return () => {};
  const publish = (s: HostSessionLike | null) => {
    window.__odletSession = encodeHostSession(s);
  };
  void client.auth.getSession().then(({ data }) => publish(data.session));
  const sub = client.auth.onAuthStateChange((_event, session) => publish(session));

  // Unity would create its own anonymous account on its first call; making the site's guest first
  // keeps one identity. Runs alongside the download, so it never delays the game.
  void (async () => {
    try {
      if ((await backendReachable()) && !(await currentUserId())) await signInAsGuest();
    } catch {
      /* offline or sign-up closed: the game falls back to its own session */
    }
  })();

  return () => sub.data.subscription.unsubscribe();
}

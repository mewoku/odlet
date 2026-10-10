"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { PixelButton } from "../ui/PixelButton";
import { PixelIcon } from "../ui/PixelIcon";
import { turnstileSiteKey } from "@/lib/turnstile";

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise: Promise<TurnstileApi> | null = null;

/** Loads Turnstile once. Injected from our own (nonce'd) bundle, so 'strict-dynamic' lets it run. */
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile missing")));
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("turnstile failed to load"));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

type Status = { kind: "idle" | "sending" | "done" } | { kind: "error"; message: string };

/** Email waitlist with a Cloudflare Turnstile check; posts to /api/waitlist. */
export function Waitlist({ source = "landing" }: { source?: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => {
    const box = boxRef.current;
    if (!box || !turnstileSiteKey) return;
    let cancelled = false;
    loadTurnstile()
      .then((ts) => {
        if (cancelled || widgetId.current) return;
        widgetId.current = ts.render(box, {
          sitekey: turnstileSiteKey,
          theme: "dark",
          size: "flexible",
          action: "waitlist",
          callback: (t: string) => setToken(t),
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken(""),
        });
      })
      .catch(() => !cancelled && setStatus({ kind: "error", message: "Captcha could not load. Disable blockers for this site and reload." }));
    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) {
      setStatus({ kind: "error", message: "Finish the captcha check first." });
      return;
    }
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, token, source }),
      });
      const out = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && out.ok) {
        setStatus({ kind: "done" });
        return;
      }
      setStatus({ kind: "error", message: out.error ?? "Something went wrong. Try again." });
    } catch {
      setStatus({ kind: "error", message: "Network error. Try again." });
    }
    // A Turnstile token is single-use: get a fresh one for the next attempt.
    setToken("");
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
  };

  if (status.kind === "done") {
    return (
      <div role="status" className="flex items-center gap-3 text-[16px] leading-6 text-text">
        <span className="grid size-10 shrink-0 place-items-center bg-teal text-bg-0" style={{ boxShadow: "inset -3px -3px 0 #135b73" }}>
          <PixelIcon name="star" size={20} />
        </span>
        You&apos;re on the list. We&apos;ll email you when Odlet launches.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-[520px] flex-col gap-3" noValidate>
      <div className="flex flex-col gap-3 min-[480px]:flex-row">
        <label htmlFor={`waitlist-email-${source}`} className="sr-only">
          Email address
        </label>
        <input
          id={`waitlist-email-${source}`}
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-border h-12 min-w-0 flex-1 bg-bg-0 px-4 text-[16px] text-text placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
        />
        <PixelButton type="submit" disabled={status.kind === "sending" || !email}>
          {status.kind === "sending" ? "Joining…" : "Join waitlist"}
        </PixelButton>
      </div>
      <div ref={boxRef} className="min-h-[65px]" />
      {status.kind === "error" && (
        <p role="alert" className="text-[14px] text-danger">
          {status.message}
        </p>
      )}
    </form>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "../ui/Toast";

/** Read-only profile link with Copy (clipboard API, falls back to select + execCommand) and native Share. */
export function ShareLink({ url, handle }: { url: string; handle: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const toast = useToast();

  // navigator.share only exists client-side; decide after mount to keep hydration identical.
  useEffect(() => setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function"), []);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      const el = input.current;
      el?.focus();
      el?.select();
      const ok = typeof document.execCommand === "function" && document.execCommand("copy");
      if (ok) setCopied(true);
      else toast("Copy failed — the link is selected, copy it manually.", "error");
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: `@${handle} on Odlet`, text: `Check out @${handle}'s Odlet profile`, url });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="flex w-full max-w-[520px] flex-col gap-1">
      <label htmlFor="profile-link" className="font-label text-[12px] leading-4 text-muted uppercase">
        Profile link
      </label>
      <div className="flex gap-2">
        <input
          id="profile-link"
          ref={input}
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="px-input min-h-10 min-w-0 flex-1 px-3 font-label text-[12px] text-muted"
        />
        <button
          type="button"
          onClick={copy}
          className="px-btn shrink-0"
          data-size="sm"
          data-variant={copied ? "primary" : "secondary"}
          aria-live="polite"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        {canShare && (
          <button type="button" onClick={share} className="px-btn shrink-0" data-size="sm" data-variant="secondary">
            Share
          </button>
        )}
      </div>
    </div>
  );
}

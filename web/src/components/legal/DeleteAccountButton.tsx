"use client";

import { useState } from "react";
import { PixelButton } from "../ui/PixelButton";
import { useSession } from "../SessionProvider";
import { useToast } from "../ui/Toast";
import { deleteMyAccount } from "@/lib/api";

/** Two-step delete for the account signed in on this browser. */
export function DeleteAccountButton() {
  const { ready, online, userId, profile, refresh } = useSession();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  if (!ready) return <p>Checking…</p>;
  if (!online) return <p>The server is unreachable right now. Try again later or use email below.</p>;
  if (!userId) return <p>You are not signed in on this browser, so there is no account here to delete.</p>;

  const remove = async () => {
    setBusy(true);
    try {
      await deleteMyAccount();
      await refresh();
      toast("Account deleted.", "ok");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Deletion failed", "error");
    } finally {
      setBusy(false);
      setArmed(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p>
        Signed in as <span className="text-text">{profile?.handle ? `@${profile.handle}` : "a guest"}</span>.
      </p>
      {!armed ? (
        <PixelButton onClick={() => setArmed(true)}>Delete this account</PixelButton>
      ) : (
        <div className="flex flex-wrap gap-3">
          <PixelButton onClick={() => void remove()} disabled={busy}>
            {busy ? "Deleting…" : "Yes, delete everything"}
          </PixelButton>
          <PixelButton onClick={() => setArmed(false)} disabled={busy}>
            Cancel
          </PixelButton>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PixelButton } from "../ui/PixelButton";
import { useToast } from "../ui/Toast";
import { VoxelViewer } from "../figure/VoxelViewer";
import { rarityColor } from "../ui/Badge";
import { useSession } from "../SessionProvider";
import { BackendUnavailableError, equipAvatar, fetchInventory, updateProfile } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { handleSchema } from "@/lib/validation";
import type { Profile } from "@/lib/types";

/** Owner-only: handle, display name and avatar (from owned figures) via update_profile. */
export function ProfileEditor({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const { refresh } = useSession();
  const router = useRouter();
  const toast = useToast();
  const inv = useAsync(() => fetchInventory(), [profile.id]);
  const [handle, setHandle] = useState(profile.handle);
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [avatar, setAvatar] = useState<string | null>(profile.avatarFigureId);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const owned = inv.status === "ready" && inv.value.source === "live" ? inv.value.data : [];

  const save = async () => {
    const h = handleSchema.safeParse(handle);
    if (!h.success) return setErr(h.error.issues[0]?.message ?? "Invalid handle");
    const name = displayName.trim();
    if (name.length > 24) return setErr("Display name: 24 characters max.");
    setErr(null);
    setBusy(true);
    try {
      const handleChanged = h.data !== profile.handle;
      const nameChanged = name !== (profile.displayName ?? "") && name.length > 0;
      if (handleChanged || nameChanged) await updateProfile({ handle: handleChanged ? h.data : null, displayName: nameChanged ? name : null });
      if (avatar && avatar !== profile.avatarFigureId) await equipAvatar(avatar);
      await refresh();
      toast("Profile saved.", "ok");
      onDone();
      if (handleChanged) router.replace(`/u/${encodeURIComponent(h.data)}`);
      else router.refresh();
    } catch (e) {
      setErr(e instanceof BackendUnavailableError ? "Saving needs the live server." : e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="edit-handle" className="font-label text-[12px] text-muted uppercase">
          Handle
        </label>
        <div className="flex items-center gap-2">
          <span className="font-pixel text-accent">@</span>
          <input
            id="edit-handle"
            className="px-input"
            value={handle}
            maxLength={20}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
            aria-describedby="edit-handle-hint"
          />
        </div>
        <p id="edit-handle-hint" className="text-[13px] leading-4 text-muted">
          3–20 letters, numbers or _. Changing it changes your profile link.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="edit-name" className="font-label text-[12px] text-muted uppercase">
          Display name
        </label>
        <input id="edit-name" className="px-input" value={displayName} maxLength={24} onChange={(e) => setDisplayName(e.target.value)} />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-label text-[12px] text-muted uppercase">Avatar</legend>
        {inv.status === "loading" && <p className="text-muted">Loading your figures…</p>}
        {inv.status === "error" && <p className="text-danger">{inv.error}</p>}
        {inv.status === "ready" && owned.length === 0 && (
          <p className="text-[15px] text-muted">
            No figures yet — get one in the shop, then equip it here.
          </p>
        )}
        {owned.length > 0 && (
          <ul className="grid max-h-[300px] grid-cols-3 gap-2 overflow-y-auto p-1 sm:grid-cols-4" role="radiogroup" aria-label="Choose avatar">
            {owned.map((f, i) => {
              const selected = f.id === avatar;
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`${f.name || "Figure"} (${f.rarity})`}
                    onClick={() => setAvatar(f.id)}
                    className="px-border flex w-full flex-col items-center gap-1 bg-bg-0 p-1"
                    style={{ ["--pb" as string]: selected ? "var(--yellow)" : "var(--line)", background: selected ? "color-mix(in srgb, var(--yellow) 12%, var(--bg-0))" : undefined }}
                  >
                    <VoxelViewer encoding={f.encoding} size={72} resolution={36} interactive={false} autoRotate={selected} phase={i} rim={rarityColor(f.rarity)} label={f.name} />
                    <span className="w-full truncate font-label text-[12px] leading-3 text-muted">{f.name || "—"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </fieldset>

      {err && (
        <p role="alert" className="text-[15px] text-danger">
          {err}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <PixelButton variant="ghost" onClick={onDone}>
          Cancel
        </PixelButton>
        <PixelButton type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </PixelButton>
      </div>
    </form>
  );
}

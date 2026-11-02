"use client";

import { useState } from "react";
import Link from "next/link";
import { PixelButton } from "../ui/PixelButton";
import { PixelPanel } from "../ui/PixelPanel";
import { DemoBadge } from "../ui/Badge";
import { Modal } from "../ui/Modal";
import { StatTile } from "../ui/StatTile";
import { useToast } from "../ui/Toast";
import { FigureCard } from "../figure/FigureCard";
import { FigureDetail } from "../figure/FigureDetail";
import { VoxelViewer } from "../figure/VoxelViewer";
import { WalletLink } from "../wallet/WalletLink";
import { useSession } from "../SessionProvider";
import { GridSkeleton } from "../market/MarketView";
import { BackendUnavailableError, equipAvatar, fetchInventory, listFigure } from "@/lib/api";
import { formatShards } from "@/lib/economy";
import { useAsync } from "@/lib/hooks";
import type { FigureRecord } from "@/lib/types";

export function InventoryView() {
  const { profile, ready, online, userId, refresh } = useSession();
  const state = useAsync(() => fetchInventory(), [userId]);
  const [open, setOpen] = useState<FigureRecord | null>(null);
  const [listing, setListing] = useState<FigureRecord | null>(null);
  const toast = useToast();
  const demo = state.status === "ready" && state.value.source === "demo";

  const fail = (e: unknown) =>
    toast(e instanceof BackendUnavailableError ? "This needs the live backend." : e instanceof Error ? e.message : "Something went wrong", "error");

  const equip = async (f: FigureRecord) => {
    try {
      await equipAvatar(f.id);
      toast(`${f.name} is your avatar now.`, "ok");
      await refresh();
    } catch (e) {
      fail(e);
    }
  };

  if (ready && online && !userId) {
    return (
      <PixelPanel accent className="mx-auto flex max-w-[480px] flex-col items-center gap-4 p-8 text-center">
        <h2 className="text-[20px]">Sign in to see your figures</h2>
        <p className="text-muted">Play as a guest — no email needed. Your figures and shards are saved to your guest account.</p>
        <PixelButton href="/login">Play as guest</PixelButton>
      </PixelPanel>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PixelPanel accent className="grid gap-4 p-4 sm:grid-cols-[auto_1fr] sm:items-center sm:p-6">
        <div className="mx-auto">
          {profile?.avatarEncoding ? (
            <VoxelViewer encoding={profile.avatarEncoding} size={128} resolution={40} label="Your avatar" />
          ) : (
            <div className="dither-bg px-border grid size-32 place-items-center font-label text-[12px] text-muted">NO AVATAR</div>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[24px] leading-8">{profile ? `@${profile.handle}` : demo ? "Guest (demo)" : "Guest"}</h2>
            {profile && (
              <Link href={`/u/${profile.handle}`} className="font-label text-[12px] text-accent underline">
                PUBLIC PROFILE
              </Link>
            )}
            {demo && <DemoBadge reason={state.status === "ready" ? state.value.reason : undefined} />}
          </div>
          {profile && (
            <div className="grid grid-cols-3 gap-3">
              <StatTile label="Shards" value={formatShards(profile.shards)} tone="yellow" />
              <StatTile label="Rating" value={profile.rating} tone="accent" />
              <StatTile label="Streak" value={profile.streak} />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <WalletLink />
          </div>
        </div>
      </PixelPanel>

      {state.status === "loading" && <GridSkeleton n={5} />}
      {state.status === "ready" && state.value.data.length === 0 && (
        <PixelPanel className="flex flex-col items-center gap-4 p-8 text-center">
          <p className="text-muted">No figures yet. Earn shards in the Daily and adventure, then visit the shop.</p>
          <PixelButton href="/market" palette="pattern">
            Visit shop
          </PixelButton>
        </PixelPanel>
      )}
      {state.status === "ready" && state.value.data.length > 0 && (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {state.value.data.map((f, i) => {
            const equipped = profile?.avatarFigureId === f.id;
            return (
              <li key={f.id}>
                <FigureCard
                  figure={f}
                  size={128}
                  phase={i}
                  highlight={equipped}
                  onOpen={() => setOpen(f)}
                  footer={
                    <div className="flex flex-col gap-2">
                      <PixelButton size="sm" variant={equipped ? "secondary" : "primary"} onClick={() => equip(f)} disabled={demo || equipped}>
                        {equipped ? "Equipped" : "Equip"}
                      </PixelButton>
                      <PixelButton size="sm" variant="secondary" palette="pattern" onClick={() => setListing(f)} disabled={demo}>
                        Sell
                      </PixelButton>
                    </div>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title="Figure" palette="forest">
        {open && <FigureDetail figure={open} />}
      </Modal>
      <ListModal figure={listing} onClose={() => setListing(null)} onDone={() => state.reload()} onError={fail} />
    </div>
  );
}

function ListModal({ figure, onClose, onDone, onError }: { figure: FigureRecord | null; onClose: () => void; onDone: () => void; onError: (e: unknown) => void }) {
  const [price, setPrice] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const toast = useToast();

  const submit = async () => {
    if (!figure) return;
    setErr(null);
    try {
      const n = Number(price);
      if (!Number.isInteger(n) || n < 10 || n > 1_000_000) return setErr("10 – 1,000,000 shards.");
      await listFigure(figure.id, { shards: n });
      toast(`${figure.name} listed.`, "ok");
      onDone();
      onClose();
    } catch (e) {
      onError(e);
    }
  };

  return (
    <Modal open={!!figure} onClose={onClose} title={`Sell ${figure?.name ?? ""}`} palette="pattern">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label className="flex flex-col gap-2">
          <span className="font-label text-[12px] text-muted">PRICE ◆</span>
          <input className="px-input" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="800" aria-invalid={!!err} />
        </label>
        {err && <p className="text-[15px] text-danger">{err}</p>}
        <PixelButton type="submit">List for sale</PixelButton>
      </form>
    </Modal>
  );
}

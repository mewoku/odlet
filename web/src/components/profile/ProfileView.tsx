"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PixelButton } from "../ui/PixelButton";
import { PixelPanel, SectionTitle } from "../ui/PixelPanel";
import { Badge, DemoBadge } from "../ui/Badge";
import { PixelIcon } from "../ui/PixelIcon";
import { StatTile } from "../ui/StatTile";
import { Modal } from "../ui/Modal";
import { useToast } from "../ui/Toast";
import { FigureCard } from "../figure/FigureCard";
import { FigureDetail } from "../figure/FigureDetail";
import { VoxelViewer } from "../figure/VoxelViewer";
import { useSession } from "../SessionProvider";
import { shortAddress } from "../wallet/WalletConnect";
import { ProfileEditor } from "./ProfileEditor";
import { ShareLink } from "./ShareLink";
import { BackendUnavailableError, fetchProfileStats, fetchPublicProfile, sendFriendRequest } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { publicEnv } from "@/lib/env";
import {
  LEVELS_PER_WORLD,
  STARS_PER_LEVEL,
  levelFromXp,
  memberSince,
  profileUrl,
  ratingTier,
  totals,
  xpFor,
  type DailyEntry,
  type ProfileStats,
  type WorldProgress,
} from "@/lib/profile";
import type { FigureRecord, Profile } from "@/lib/types";

export function ProfileView({ handle }: { handle: string }) {
  const state = useAsync(() => fetchPublicProfile(handle), [handle]);
  const { profile: me, ready } = useSession();
  const [open, setOpen] = useState<FigureRecord | null>(null);
  const [editing, setEditing] = useState(false);
  const toast = useToast();

  if (state.status === "loading") return <ProfileSkeleton />;
  if (state.status === "error") {
    return (
      <PixelPanel className="flex flex-col items-center gap-4 p-8 text-center">
        <p className="text-danger">{state.error}</p>
        <PixelButton onClick={state.reload} variant="secondary">
          Retry
        </PixelButton>
      </PixelPanel>
    );
  }
  const { data, source, reason } = state.value;
  if (!data) {
    return (
      <PixelPanel accent className="mx-auto flex max-w-[520px] flex-col items-center gap-4 p-8 text-center">
        <div className="dither-bg px-border grid size-24 place-items-center font-pixel text-[24px] text-muted">?</div>
        <h1 className="text-[24px] leading-8">@{handle}</h1>
        <p className="text-muted">No player with that handle yet. Handles can change — ask your friend for their new link.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <PixelButton href="/friends">Find friends</PixelButton>
          <PixelButton href="/leaderboard" variant="secondary">
            Leaderboard
          </PixelButton>
        </div>
      </PixelPanel>
    );
  }
  const { profile, collection } = data;
  const isMe = ready && !!me && me.id === profile.id;
  // Your own session row is fresher (and includes the avatar you just equipped).
  const shown: Profile = isMe && me ? { ...profile, ...me, walletAddress: me.walletAddress } : profile;

  const addFriend = async () => {
    try {
      await sendFriendRequest(profile.handle);
      toast(`Friend request sent to @${profile.handle}`, "ok");
    } catch (e) {
      toast(e instanceof BackendUnavailableError ? "Friends need the live backend." : e instanceof Error ? e.message : "Failed", "error");
    }
  };

  return (
    <div className="flex flex-col gap-10">
      <ProfileBody
        profile={shown}
        collection={collection}
        demo={source === "demo"}
        demoReason={reason}
        isMe={isMe}
        onEdit={() => setEditing(true)}
        onAddFriend={addFriend}
        onOpenFigure={setOpen}
      />

      <Modal open={!!open} onClose={() => setOpen(null)} title="Figure" palette="frost">
        {open && <FigureDetail figure={open} />}
      </Modal>
      {isMe && me && (
        <Modal open={editing} onClose={() => setEditing(false)} title="Edit profile" palette="frost">
          <ProfileEditor profile={me} onDone={() => setEditing(false)} />
        </Modal>
      )}
    </div>
  );
}

function ProfileBody({
  profile,
  collection,
  demo,
  demoReason,
  isMe,
  onEdit,
  onAddFriend,
  onOpenFigure,
}: {
  profile: Profile;
  collection: FigureRecord[];
  demo: boolean;
  demoReason?: string;
  isMe: boolean;
  onEdit: () => void;
  onAddFriend: () => void;
  onOpenFigure: (f: FigureRecord) => void;
}) {
  const stats = useAsync(
    () => fetchProfileStats(profile.handle, { isMe, completedDailies: profile.completedDailies, figures: collection.length }),
    [profile.handle, isMe, demo],
  );
  const s: ProfileStats | null = stats.status === "ready" ? stats.value.data : null;
  const t = s ? totals(s.worlds) : { cleared: 0, stars: 0, bosses: 0 };
  const lvl = levelFromXp(xpFor(t, s?.completedDailies ?? profile.completedDailies));
  const tier = ratingTier(profile.rating);
  const since = memberSince(profile.createdAt);
  const figures = s?.figures ?? collection.length;
  const avatar = collection.find((f) => f.id === profile.avatarFigureId);

  return (
    <>
      {/* ---------- hero card ---------- */}
      <PixelPanel accent className="relative grid gap-6 overflow-hidden p-4 sm:p-8 md:grid-cols-[auto_1fr] md:items-center">
        <div
          className="relative mx-auto flex flex-col items-center"
          style={{ background: "radial-gradient(closest-side, color-mix(in srgb, var(--accent) 28%, transparent), transparent)" }}
        >
          {profile.avatarEncoding ? (
            <VoxelViewer encoding={profile.avatarEncoding} size={256} resolution={64} rim={tier.color} label={`@${profile.handle}'s avatar`} />
          ) : (
            <div className="dither-bg px-border grid size-[256px] place-items-center p-6 text-center font-pixel text-[12px] leading-5 text-muted">
              NO AVATAR
              {isMe && <span className="text-[10px] text-accent">Pick one of your figures</span>}
            </div>
          )}
          {avatar && <p className="-mt-2 font-pixel text-[10px] text-muted uppercase">{avatar.name}</p>}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <TierBadge name={tier.name} color={tier.color} />
            <Badge color="var(--yellow)">LV {lvl.level}</Badge>
            {demo && <DemoBadge reason={demoReason} />}
            {isMe && <Badge color="var(--ok)">You</Badge>}
          </div>
          <div className="min-w-0">
            <h1 className="glow-text truncate text-[28px] leading-9 sm:text-[40px] sm:leading-[48px]">{profile.displayName || profile.handle}</h1>
            <p className="font-pixel text-[12px] leading-4 text-accent">@{profile.handle}</p>
          </div>

          <XpBar level={lvl.level} into={lvl.into} need={lvl.need} progress={lvl.progress} />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-pixel text-[10px] leading-4 text-muted uppercase">
            {since && <span>Member since {since}</span>}
            {profile.walletAddress && <span>Wallet {shortAddress(profile.walletAddress)}</span>}
          </div>

          <ShareLink url={profileUrl(publicEnv.siteUrl, profile.handle)} handle={profile.handle} />

          <div className="flex flex-wrap items-center gap-3">
            {isMe ? (
              <>
                <PixelButton onClick={onEdit} size="sm">
                  Edit profile
                </PixelButton>
                <PixelButton href="/inventory" size="sm" variant="secondary">
                  Collection
                </PixelButton>
              </>
            ) : (
              <PixelButton onClick={onAddFriend} size="sm" disabled={demo}>
                <PixelIcon name="friends" size={16} /> Add friend
              </PixelButton>
            )}
          </div>
        </div>
      </PixelPanel>

      {/* ---------- stats ---------- */}
      <section aria-label="Stats" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Rating" value={profile.rating} hint={tier.next ? `${tier.next - profile.rating} to next tier` : "Top tier"} tone="accent" />
        <StatTile label="Streak" value={profile.streak} hint="days in a row" tone="yellow" />
        <StatTile label="Best streak" value={profile.bestStreak} />
        <StatTile label="Dailies" value={s?.completedDailies ?? profile.completedDailies} hint="completed" />
        <StatTile label="Stars" value={s?.scope === "full" ? t.stars : "—"} hint={s?.scope === "full" ? `of ${LEVELS_PER_WORLD * STARS_PER_LEVEL * 5}` : "private"} />
        <StatTile label="Figures" value={figures} hint="collected" />
      </section>

      {/* ---------- adventure ---------- */}
      <section aria-label="Adventure progress">
        <SectionTitle kicker="Adventure" title={s?.scope === "full" ? `${t.cleared} / ${LEVELS_PER_WORLD * 5} levels cleared` : "Adventure progress"} />
        {stats.status === "loading" ? (
          <div className="grid gap-3 sm:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="px-panel dither-bg h-[124px] animate-pulse" />
            ))}
          </div>
        ) : s?.scope === "full" ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {s.worlds.map((w) => (
              <WorldCard key={w.world} w={w} />
            ))}
          </ul>
        ) : (
          <PixelPanel className="flex flex-col items-start gap-2 p-6 text-muted sm:flex-row sm:items-center sm:justify-between">
            <span>
              <PixelIcon name="lock" size={16} className="mr-2 inline-block align-[-2px]" />
              Adventure progress is private for now.
            </span>
            {stats.status === "error" && <span className="text-[12px] text-danger">{stats.error}</span>}
          </PixelPanel>
        )}
      </section>

      {/* ---------- daily history ---------- */}
      <section aria-label="Daily history">
        <SectionTitle kicker="The Daily" title="Recent runs" />
        {s?.scope === "full" && s.daily.length > 0 ? (
          <DailyHistory rows={s.daily} />
        ) : (
          <PixelPanel className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted">
              {s?.scope === "public" ? "Daily history is private for now." : isMe ? "No Daily runs yet. Three puzzles, one try a day." : "No Daily runs yet."}
            </p>
            {isMe && (
              <PixelButton href="/daily" size="sm" palette="pattern">
                <PixelIcon name="bolt" size={16} /> Play today&apos;s Daily
              </PixelButton>
            )}
          </PixelPanel>
        )}
      </section>

      {/* ---------- collection ---------- */}
      <section aria-label="Collection">
        <SectionTitle kicker="Collection" title={`${figures} figure${figures === 1 ? "" : "s"}`} />
        {collection.length === 0 ? (
          <PixelPanel className="flex flex-col items-center gap-3 p-6 text-center text-muted">
            <p>No figures yet.</p>
            {isMe && (
              <PixelButton href="/market" size="sm" palette="link">
                Visit the shop
              </PixelButton>
            )}
          </PixelPanel>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {collection.slice(0, 12).map((f, i) => (
              <li key={f.id}>
                <FigureCard figure={f} size={120} phase={i} highlight={f.id === profile.avatarFigureId} onOpen={() => onOpenFigure(f)} />
              </li>
            ))}
          </ul>
        )}
        {collection.length > 12 && <p className="mt-3 font-pixel text-[10px] text-muted">+{collection.length - 12} MORE</p>}
      </section>
    </>
  );
}

function TierBadge({ name, color }: { name: string; color: string }) {
  return (
    <Badge color={color}>
      <svg aria-hidden="true" width="10" height="10" viewBox="0 0 5 5" shapeRendering="crispEdges">
        <path d="M2 0h1v1h1v1h1v1h-1v1h-1v1h-1v-1h-1v-1h-1v-1h1v-1h1z" fill="currentColor" />
      </svg>
      {name}
    </Badge>
  );
}

function XpBar({ level, into, need, progress }: { level: number; into: number; need: number; progress: number }) {
  const cells = 20;
  const filled = Math.round(progress * cells);
  return (
    <div>
      <div className="flex justify-between font-pixel text-[10px] leading-4 text-muted uppercase">
        <span>Level {level}</span>
        <span className="tabular">
          {into} / {need} XP
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`Level ${level} progress`}
        aria-valuemin={0}
        aria-valuemax={need}
        aria-valuenow={into}
        className="px-border mt-1 grid h-4 gap-[2px] bg-bg-0 p-[2px]"
        style={{ gridTemplateColumns: `repeat(${cells}, 1fr)` }}
      >
        {Array.from({ length: cells }, (_, i) => (
          <span key={i} style={{ background: i < filled ? (i % 2 ? "var(--yellow)" : "#FFC83D") : "rgb(255 255 255 / 0.05)" }} />
        ))}
      </div>
    </div>
  );
}

function WorldCard({ w }: { w: WorldProgress }) {
  const pct = w.cleared / LEVELS_PER_WORLD;
  const maxStars = LEVELS_PER_WORLD * STARS_PER_LEVEL;
  return (
    <li data-palette={w.palette} data-accent={w.cleared > 0 ? "true" : undefined} className="px-panel flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <span className="font-pixel text-[10px] text-muted">WORLD {w.world + 1}</span>
        {w.boss ? <Badge color="var(--accent)">Boss down</Badge> : w.cleared === 0 ? <PixelIcon name="lock" size={12} className="text-muted" /> : null}
      </div>
      <h3 className="text-[18px] leading-6 text-accent">{w.name}</h3>
      <div className="grid grid-cols-12 gap-[2px]" aria-hidden="true">
        {Array.from({ length: LEVELS_PER_WORLD }, (_, i) => (
          <span key={i} className="h-2" style={{ background: i < w.cleared ? (i === LEVELS_PER_WORLD - 1 ? "var(--accent-2)" : "var(--accent)") : "rgb(255 255 255 / 0.07)" }} />
        ))}
      </div>
      <div className="flex justify-between font-pixel text-[10px] leading-4">
        <span className="tabular text-text">
          {w.cleared}/{LEVELS_PER_WORLD}
          <span className="sr-only"> levels cleared ({Math.round(pct * 100)}%)</span>
        </span>
        <span className="tabular text-yellow">
          ★ {w.stars}/{maxStars}
        </span>
      </div>
    </li>
  );
}

function DailyHistory({ rows }: { rows: DailyEntry[] }) {
  return (
    <PixelPanel padded={false}>
      <table className="w-full text-left">
        <thead>
          <tr className="font-pixel text-[10px] text-muted uppercase">
            <th className="px-4 py-3 font-normal">Day</th>
            <th className="px-2 py-3 font-normal">Trials</th>
            <th className="px-2 py-3 text-right font-normal">Points</th>
            <th className="hidden px-4 py-3 text-right font-normal sm:table-cell">Rating</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const older = rows[i + 1];
            const delta = r.ratingAfter != null && older?.ratingAfter != null && older.day === r.day - 1 ? r.ratingAfter - older.ratingAfter : null;
            return (
              <tr key={r.day} className="border-t-2 border-line">
                <td className="px-4 py-2 font-pixel text-[12px] text-text">#{r.day}</td>
                <td className="px-2 py-2">
                  <span className="flex gap-1" aria-label={`${r.solved} of 3 solved`}>
                    {[0, 1, 2].map((k) => (
                      <span
                        key={k}
                        className="size-4"
                        style={{
                          background: k < r.solved ? ["var(--pattern-accent)", "var(--lab-accent)", "var(--link-accent)"][k] : "rgb(255 255 255 / 0.08)",
                          boxShadow: k < r.solved ? "inset -2px -2px 0 rgb(0 0 0 / 0.3)" : undefined,
                        }}
                      />
                    ))}
                  </span>
                </td>
                <td className="tabular px-2 py-2 text-right font-pixel text-[12px] text-yellow">{r.points}</td>
                <td className="tabular hidden px-4 py-2 text-right font-pixel text-[12px] text-text sm:table-cell">
                  {r.ratingAfter ?? "—"}
                  {delta != null && delta !== 0 && (
                    <span className={`ml-2 ${delta > 0 ? "text-ok" : "text-danger"}`}>
                      {delta > 0 ? "+" : ""}
                      {delta}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </PixelPanel>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-10" aria-busy="true" aria-label="Loading profile">
      <div className="px-panel dither-bg grid gap-6 p-8 md:grid-cols-[auto_1fr]">
        <div className="mx-auto size-[256px] animate-pulse bg-surface-2" />
        <div className="flex flex-col gap-4">
          <div className="h-6 w-40 animate-pulse bg-surface-2" />
          <div className="h-10 w-64 animate-pulse bg-surface-2" />
          <div className="h-4 w-full animate-pulse bg-surface-2" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="px-panel h-[76px] animate-pulse" />
        ))}
      </div>
    </div>
  );
}

/** Client redirect for /me: your own profile, or sign-in. */
export function MeRedirect() {
  const { ready, profile } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    router.replace(profile ? `/u/${encodeURIComponent(profile.handle)}` : "/login");
  }, [ready, profile, router]);
  return <ProfileSkeleton />;
}

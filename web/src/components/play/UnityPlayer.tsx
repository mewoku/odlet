"use client";

import { useEffect, useRef, useState } from "react";
import { Unity, useUnityContext } from "react-unity-webgl";
import { PixelButton } from "../ui/PixelButton";
import { PixelPanel } from "../ui/PixelPanel";
import { PixelIcon } from "../ui/PixelIcon";
import { VoxelViewer } from "../figure/VoxelViewer";
import { demoFigures } from "@/lib/demo/data";
import type { UnityBuildFiles } from "@/lib/server/unityBuild";
import { installMasterGain, readVolume, setVolume, type VolumeState } from "./gameAudio";

// Wrap AudioContext before the Unity loader can create one (module eval runs before any effect).
if (typeof window !== "undefined") installMasterGain();

/** No download progress for this long → offer a retry. Boot (after the download) gets BOOT_STALL_MS. */
const STALL_MS = 25_000;
const BOOT_STALL_MS = 45_000;

export function PixelProgress({ value, label }: { value: number; label: string }) {
  const segments = 20;
  const filled = Math.round(Math.max(0, Math.min(1, value)) * segments);
  return (
    <div className="w-full max-w-[360px]" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <div className="mb-2 flex justify-between font-label text-[13px] text-muted">
        <span>{label}</span>
        <span className="tabular text-accent">{Math.round(value * 100)}%</span>
      </div>
      <div className="px-border flex gap-[2px] bg-bg-0 p-[2px]">
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className="h-4 flex-1"
            style={{
              background: i < filled ? (i === filled - 1 ? "var(--yellow)" : "linear-gradient(180deg, var(--accent), var(--accent-2))") : "var(--surface-2)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function UnityPlayer({ build }: { build: UnityBuildFiles | null }) {
  // null until checked on the client (no WebGL probe during SSR).
  const [webgl2, setWebgl2] = useState<boolean | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    try {
      setWebgl2(typeof WebAssembly === "object" && !!document.createElement("canvas").getContext("webgl2"));
    } catch {
      setWebgl2(false);
    }
  }, []);
  if (!build) return <BuildMissing />;
  if (webgl2 === false) return <NoWebGL />;
  // Remounting (new key) starts a fresh Unity instance after a failed download.
  return <UnityFrame key={attempt} build={build} onRetry={() => setAttempt((a) => a + 1)} />;
}

function UnityFrame({ build, onRetry }: { build: UnityBuildFiles; onRetry: () => void }) {
  const { unityProvider, isLoaded, loadingProgression, initialisationError, requestFullscreen } = useUnityContext({
    ...build,
    companyName: "ODLET",
    productName: "ODLET",
    productVersion: "2",
    // Unity 6 WebGL: flush persistentDataPath (profile.json) to IndexedDB so progress survives reloads.
    autoSyncPersistentDataPath: true,
  });
  const [dpr, setDpr] = useState(1);
  useEffect(() => setDpr(Math.min(2, window.devicePixelRatio || 1)), []);

  // Unity reports some failures (out of memory, cache, wasm compile) only as window errors; without
  // this the loader would sit on "BOOTING" forever.
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  useEffect(() => {
    if (isLoaded) return;
    const fromUnity = (src: string, msg: string) => /\/unity\/|blob:|\.wasm|unityweb/i.test(src) || /unity|webassembly|wasm|out of memory|abort\(/i.test(msg);
    const onError = (e: ErrorEvent) => {
      const msg = e.message || String(e.error ?? "");
      if (fromUnity(e.filename ?? "", msg)) setRuntimeError(msg);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason as { message?: string; stack?: string } | undefined;
      const msg = String(reason?.message ?? e.reason ?? "");
      if (fromUnity(String(reason?.stack ?? ""), msg)) setRuntimeError(msg);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [isLoaded]);

  // Watchdog: progress that stops moving shows a slow-load notice with retry instead of a frozen bar.
  const [stalled, setStalled] = useState(false);
  const progress = useRef({ value: -1, at: 0 });
  useEffect(() => {
    progress.current = { value: loadingProgression, at: Date.now() };
    setStalled(false);
  }, [loadingProgression]);
  useEffect(() => {
    if (isLoaded) return;
    const id = window.setInterval(() => {
      const p = progress.current;
      if (Date.now() - p.at > (p.value >= 0.9 ? BOOT_STALL_MS : STALL_MS)) setStalled(true);
    }, 1000);
    return () => window.clearInterval(id);
  }, [isLoaded]);
  const failure = initialisationError ? String(initialisationError.message ?? initialisationError) : runtimeError;

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="px-panel relative overflow-hidden p-0"
        // The game is laid out for a 9:19.5 phone. Width follows the available height so the aspect
        // never breaks (a squashed viewport made battle cards overflow on desktop).
        style={{ aspectRatio: "9 / 19.5", width: "min(100%, 520px, calc((100dvh - 250px) * 9 / 19.5))", minWidth: "300px" }}
        // Keyboard (arrows / WASD) goes to the game as soon as it's clicked.
        onPointerDown={(e) => e.currentTarget.querySelector("canvas")?.focus()}
      >
        <Unity
          unityProvider={unityProvider}
          devicePixelRatio={dpr}
          className="block h-full w-full"
          style={{ visibility: isLoaded ? "visible" : "hidden" }}
          tabIndex={0}
        />
        {!isLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-6">
            {failure ? (
              <>
                <p className="font-label text-[15px] text-danger">GAME FAILED TO START</p>
                <p className="max-h-[120px] overflow-auto text-center text-[14px] break-words text-muted">{failure.slice(0, 400)}</p>
                <RetryButtons onRetry={onRetry} />
              </>
            ) : (
              <>
                <p className="font-pixel text-[24px] text-teal">ODLET</p>
                <PixelProgress value={loadingProgression} label={loadingProgression >= 0.9 ? "STARTING" : "LOADING"} />
                <p className="px-blink font-label text-[12px] text-muted">{loadingProgression >= 0.9 ? "WARMING UP…" : "DOWNLOADING ~12 MB…"}</p>
                {stalled && (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <p className="text-[14px] leading-5 text-muted">Taking longer than usual. A slow connection or an old cached copy can do this.</p>
                    <RetryButtons onRetry={onRetry} />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <PixelButton variant="secondary" size="sm" onClick={() => requestFullscreen(true)} disabled={!isLoaded}>
          Fullscreen
        </PixelButton>
        <VolumeControl />
        <p className="font-label text-[12px] text-muted">CLICK / TAP TO PLAY · ARROWS OR WASD TO MOVE · DRAG TO SWIPE</p>
      </div>
    </div>
  );
}

/** Retry, or wipe Unity's download cache first (never the save in /idbfs) when a stale copy is stuck. */
function RetryButtons({ onRetry }: { onRetry: () => void }) {
  const [busy, setBusy] = useState(false);
  const reset = async () => {
    setBusy(true);
    try {
      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase("UnityCache");
        req.onsuccess = req.onerror = req.onblocked = () => resolve();
      });
      if ("caches" in window) for (const k of await caches.keys()) if (/unity/i.test(k)) await caches.delete(k);
    } catch {
      // nothing cached / storage blocked
    }
    window.location.reload();
  };
  return (
    <div className="flex flex-wrap justify-center gap-3">
      <PixelButton size="sm" onClick={onRetry}>
        Try again
      </PixelButton>
      <PixelButton size="sm" variant="secondary" onClick={reset} disabled={busy}>
        Clear cache &amp; reload
      </PixelButton>
    </div>
  );
}

/** Mute toggle + volume slider; drives the master gain from gameAudio.ts (no Unity rebuild needed). */
function VolumeControl() {
  const [v, setV] = useState<VolumeState | null>(null);
  useEffect(() => setV(readVolume()), []);
  if (!v) return null;
  const update = (next: VolumeState) => {
    setV(next);
    setVolume(next);
  };
  const silent = v.muted || v.volume === 0;
  return (
    <div className="flex items-center gap-2">
      <PixelButton
        variant="secondary"
        size="sm"
        onClick={() => update(silent ? { volume: v.volume || 0.5, muted: false } : { ...v, muted: true })}
        aria-pressed={silent}
        aria-label={silent ? "Unmute game sound" : "Mute game sound"}
      >
        {silent ? "Sound off" : "Sound on"}
      </PixelButton>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={Math.round((v.muted ? 0 : v.volume) * 100)}
        onChange={(e) => update({ volume: Number(e.target.value) / 100, muted: false })}
        aria-label="Game volume"
        className="w-24 accent-[var(--teal)]"
      />
    </div>
  );
}

function NoWebGL() {
  return (
    <PixelPanel accent className="mx-auto flex max-w-[560px] flex-col items-center gap-4 p-6 text-center md:p-10">
      <p className="font-label text-[13px] text-warn uppercase">WebGL 2 unavailable</p>
      <h2 className="text-[24px] leading-8">This browser can&apos;t run the game.</h2>
      <p className="text-[15px] leading-6 text-muted">
        Odlet needs WebGL 2 — current Chrome, Edge, Firefox or Safari 15+. If you&apos;re on one of those, turn on hardware acceleration and reload.
      </p>
    </PixelPanel>
  );
}

function BuildMissing() {
  const fig = demoFigures[2]!;
  return (
    <PixelPanel accent className="mx-auto flex max-w-[560px] flex-col items-center gap-6 p-6 text-center md:p-10">
      <VoxelViewer encoding={fig.encoding} size={160} resolution={48} label="Waiting figure" />
      <div>
        <p className="font-label text-[13px] text-warn uppercase">
          <PixelIcon name="lock" size={12} className="mr-2 inline" />
          Build not available yet
        </p>
        <h2 className="mt-2 text-[24px] leading-8">The browser build is still in the oven.</h2>
        <p className="mt-2 text-[15px] leading-6 text-muted">
          The Unity WebGL build hasn&apos;t been exported to <code className="text-text">web/public/unity/Build/</code> yet. Once it is, this page loads it automatically.
        </p>
      </div>
      <PixelProgress value={0} label="WAITING FOR BUILD" />
      <div className="flex flex-wrap justify-center gap-4">
        <PixelButton href="/market" palette="pattern">
          Browse figures
        </PixelButton>
        <PixelButton href="/leaderboard" variant="secondary" palette="link">
          Leaderboard
        </PixelButton>
      </div>
    </PixelPanel>
  );
}

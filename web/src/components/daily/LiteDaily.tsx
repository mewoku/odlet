"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyMove,
  dailyPlan,
  dayNumber,
  edgeKey,
  generateTrial,
  gridGet,
  rotate,
  shadow,
  untilResetMs,
  validateTrial,
  type TrialData,
  type TrialKind,
} from "@ronriku/core";
import { PixelButton } from "../ui/PixelButton";
import { PixelIcon } from "../ui/PixelIcon";
import { useSession } from "../SessionProvider";
import { bankDaily, fetchLeaderboard, setHandle } from "@/lib/api";
import type { DailyBank, TrialRun } from "@/lib/dailyRun";
import { handleSchema } from "@/lib/validation";

/**
 * Today's Daily, playable the moment the page loads: no Unity, no canvas, plain DOM/SVG over @ronriku/core.
 * It is also the fallback for TVs, fridges and any browser that cannot run the WebGL game.
 * Same rules as the Unity game (one tap on Pattern, SKIP after the time limit), so a finished run can be
 * banked: the server replays the answers via submit_daily and updates rating and streak. Without a
 * connection the result simply stays on this device.
 */

const LABEL: Record<TrialKind, string> = { Pattern: "PATTERN", Spatial: "SPATIAL", Logic: "LINK" };
const HELP: Record<TrialKind, string> = {
  Pattern: "Find the rule from the examples. Pick what the last grid becomes.",
  Spatial: "Turn the shape until its top-down shadow matches the target.",
  Logic: "Draw one path through every cell, from 1 up through the numbers in order.",
};

/** What a trial component reports; the wrapper adds kind and elapsed time. */
type Finish = Pick<TrialRun, "solved" | "answer" | "moves" | "resets">;

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const STORE_KEY = "odlet.lite.v2";
interface Saved {
  lastDay: number;
  streak: number;
  runs: TrialRun[];
  bank: DailyBank | null;
}

function loadSaved(): Saved | null {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

function save(value: Saved) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(value));
  } catch {
    /* private mode or full storage: the run still plays, it just is not remembered */
  }
}

function Shake({ on, children }: { on: number; children: React.ReactNode }) {
  return (
    <div key={on} className={on ? "lite-shake" : undefined}>
      {children}
    </div>
  );
}

function Mask({ mask, size, cell = 14, lit = "var(--accent)" }: { mask: number; size: number; cell?: number; lit?: string }) {
  const px = size * (cell + 2) + 2;
  return (
    <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} shapeRendering="crispEdges" aria-hidden="true">
      <rect width={px} height={px} fill="color-mix(in srgb, var(--ambient) 70%, #07080b)" />
      {Array.from({ length: size * size }, (_, i) => {
        const on = size === 4 ? gridGet(mask, i % 4, Math.floor(i / 4)) : (mask & (1 << i)) !== 0;
        return (
          <rect
            key={i}
            x={2 + (i % size) * (cell + 2)}
            y={2 + Math.floor(i / size) * (cell + 2)}
            width={cell}
            height={cell}
            fill={on ? lit : "color-mix(in srgb, var(--line) 80%, transparent)"}
          />
        );
      })}
    </svg>
  );
}

function PatternTrial({ data, onFinish }: { data: Extract<TrialData, { kind: "Pattern" }>["data"]; onFinish: (f: Finish) => void }) {
  // One tap answers, as in the game: a wrong pick ends the trial and shows the right option.
  const [chosen, setChosen] = useState<number | null>(null);
  const taken = useRef(false);
  const [shake, setShake] = useState(0);
  const pick = useCallback(
    (option: number) => {
      if (taken.current) return;
      taken.current = true;
      setChosen(option);
      const solved = validateTrial({ kind: "Pattern", data }, option);
      if (!solved) setShake((n) => n + 1);
      onFinish({ solved, answer: option, moves: 1, resets: 0 });
    },
    [data, onFinish],
  );
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= data.options.length) pick(n - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [data, pick]);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        {data.examples.map(([a, b], i) => (
          <div key={i} className="flex items-center gap-2">
            <Mask mask={a} size={4} cell={12} />
            <span className="font-label text-muted">→</span>
            <Mask mask={b} size={4} cell={12} />
          </div>
        ))}
        <div className="flex items-center gap-2">
          <Mask mask={data.testInput} size={4} cell={12} lit="var(--accent-2)" />
          <span className="font-label text-muted">→</span>
          <span className="font-label grid h-[66px] w-[66px] place-items-center border-2 border-dashed border-[var(--line)] text-[22px] text-muted">?</span>
        </div>
      </div>
      <Shake on={shake}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {data.options.map((o, i) => (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              aria-label={`Option ${i + 1}`}
              className="lite-opt grid place-items-center p-2"
              data-state={chosen === null ? undefined : i === data.correctOption ? "right" : i === chosen ? "wrong" : "dim"}
              disabled={chosen !== null}
            >
              <Mask mask={o} size={4} cell={14} />
              <span className="font-label mt-1 text-[11px] text-muted">{i + 1}</span>
            </button>
          ))}
        </div>
      </Shake>
    </div>
  );
}

function SpatialTrial({ data, onFinish }: { data: Extract<TrialData, { kind: "Spatial" }>["data"]; onFinish: (f: Finish) => void }) {
  const [orientation, setOrientation] = useState(data.startOrientation);
  const moves = useRef<number[]>([]);
  const trail = useRef<number[]>([data.startOrientation]); // orientation after each move, so UNDO needs no inverse
  const resets = useRef(0);
  const [count, setCount] = useState(0);
  const done = useRef(false);

  const move = useCallback(
    (m: number) => {
      if (done.current) return;
      const next = applyMove(trail.current[trail.current.length - 1] ?? data.startOrientation, m);
      moves.current.push(m);
      trail.current.push(next);
      setCount(moves.current.length);
      setOrientation(next);
      if (validateTrial({ kind: "Spatial", data }, moves.current)) {
        done.current = true;
        onFinish({ solved: true, answer: [...moves.current], moves: moves.current.length, resets: resets.current });
      }
    },
    [data, onFinish],
  );

  const undo = useCallback(() => {
    if (done.current || moves.current.length === 0) return;
    moves.current.pop();
    trail.current.pop();
    setCount(moves.current.length);
    setOrientation(trail.current[trail.current.length - 1] ?? data.startOrientation);
  }, [data.startOrientation]);

  const reset = useCallback(() => {
    if (done.current || moves.current.length === 0) return;
    resets.current += 1; // a restart costs points, as in the game
    moves.current = [];
    trail.current = [data.startOrientation];
    setCount(0);
    setOrientation(data.startOrientation);
  }, [data.startOrientation]);

  useEffect(() => {
    const keys: Record<string, number> = { ArrowLeft: 0, ArrowRight: 1, ArrowUp: 2, ArrowDown: 3 };
    const onKey = (e: KeyboardEvent) => {
      const m = keys[e.key];
      if (m !== undefined) {
        e.preventDefault();
        move(m);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, undo]);

  // Cubes rotated into the current view, drawn back to front; height reads as a small diagonal lift.
  const cubes = useMemo(
    () => data.cubes.map((c) => rotate(orientation, c)).sort((a, b) => a[2] - b[2]),
    [data.cubes, orientation],
  );
  const cell = 26;
  const target = data.targetShadow;
  const current = shadow(data.cubes, orientation);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex flex-wrap items-end justify-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <svg width={cell * 3 + 24} height={cell * 3 + 24} shapeRendering="crispEdges" aria-label="Your shape">
            <rect width={cell * 3 + 24} height={cell * 3 + 24} fill="color-mix(in srgb, var(--ambient) 70%, #07080b)" />
            {cubes.map(([x, y, z], i) => (
              <rect
                key={i}
                x={4 + Math.round(x) * cell + Math.round(z) * 4}
                y={4 + Math.round(y) * cell - Math.round(z) * 4}
                width={cell - 2}
                height={cell - 2}
                fill={["#a89c20", "#c8bb2c", "#E8DA37"][Math.max(0, Math.min(2, Math.round(z)))]}
              />
            ))}
          </svg>
          <span className="font-label text-[11px] text-muted">SHAPE</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Mask mask={current} size={3} cell={22} lit={current === target ? "var(--accent-2)" : "var(--accent)"} />
          <span className="font-label text-[11px] text-muted">SHADOW</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Mask mask={target} size={3} cell={22} lit="var(--accent-2)" />
          <span className="font-label text-[11px] text-muted">TARGET · PAR {data.par}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["TURN ←", 0],
          ["TURN →", 1],
          ["TIP ↑", 2],
          ["TIP ↓", 3],
        ].map(([label, m]) => (
          <button key={label as string} type="button" className="lite-opt font-label px-4 py-3 text-[14px]" onClick={() => move(m as number)}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" className="lite-opt font-label px-4 py-2 text-[13px]" onClick={undo}>
          UNDO
        </button>
        <button type="button" className="lite-opt font-label px-4 py-2 text-[13px]" onClick={reset}>
          RESET
        </button>
        <span className="font-label text-[12px] text-muted">MOVES {count} · ARROW KEYS, BACKSPACE UNDOES</span>
      </div>
    </div>
  );
}

function LogicTrial({ data, onFinish }: { data: Extract<TrialData, { kind: "Logic" }>["data"]; onFinish: (f: Finish) => void }) {
  const { size, checkpoints, walls } = data;
  const cells = size * size;
  const wallSet = useMemo(() => new Set(walls), [walls]);
  const [path, setPathState] = useState<number[]>([]);
  const pathRef = useRef<number[]>([]);
  const resets = useRef(0); // CLEAR presses on a started path; each costs points, as a restart does in the game
  const done = useRef(false);

  const blocked = useCallback((a: number, b: number) => wallSet.has(edgeKey(a, b, cells)), [wallSet, cells]);

  const setPath = useCallback((next: number[]) => {
    pathRef.current = next;
    setPathState(next);
  }, []);

  const step = useCallback(
    (cell: number) => {
      if (done.current) return;
      const p = pathRef.current;
      let next = p;
      if (p.length === 0) {
        if (checkpoints[cell] === 1) next = [cell];
      } else {
        const at = p.indexOf(cell);
        const head = p[p.length - 1] ?? 0;
        const adjacent = Math.abs((head % size) - (cell % size)) + Math.abs(Math.floor(head / size) - Math.floor(cell / size)) === 1;
        if (at >= 0) next = p.slice(0, at + 1);
        else if (adjacent && !blocked(head, cell)) next = [...p, cell];
      }
      if (next === p) return;
      setPath(next);
      if (next.length === cells && validateTrial({ kind: "Logic", data }, next)) {
        done.current = true;
        onFinish({ solved: true, answer: next, moves: next.length - 1, resets: resets.current });
      }
    },
    [blocked, cells, checkpoints, data, onFinish, setPath, size],
  );

  useEffect(() => {
    const dir: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const onKey = (e: KeyboardEvent) => {
      const d = dir[e.key];
      if (!d) return;
      e.preventDefault();
      if (path.length === 0) {
        step(checkpoints.indexOf(1));
        return;
      }
      const head = path[path.length - 1] ?? 0;
      const x = (head % size) + d[0], y = Math.floor(head / size) + d[1];
      if (x >= 0 && y >= 0 && x < size && y < size) step(x + size * y);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [path, step, checkpoints, size]);

  const order = useMemo(() => new Map(path.map((c, i) => [c, i])), [path]);
  const cellPx = size <= 5 ? 64 : 54;

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="grid touch-none select-none gap-[3px] bg-[var(--line)] p-[3px]"
        style={{ gridTemplateColumns: `repeat(${size}, ${cellPx}px)` }}
      >
        {Array.from({ length: cells }, (_, c) => {
          const x = c % size, y = Math.floor(c / size);
          const right = x < size - 1 && blocked(c, c + 1);
          const down = y < size - 1 && blocked(c, c + size);
          const idx = order.get(c);
          const head = idx !== undefined && idx === path.length - 1;
          return (
            <div
              key={c}
              onPointerDown={(e) => {
                (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
                step(c);
              }}
              onPointerEnter={(e) => e.buttons === 1 && step(c)}
              className="font-label grid place-items-center text-[18px]"
              style={{
                width: cellPx,
                height: cellPx,
                background:
                  idx === undefined
                    ? "color-mix(in srgb, var(--ambient) 70%, #07080b)"
                    : head
                      ? "var(--accent-2)"
                      : `color-mix(in srgb, var(--accent) ${55 + Math.round((idx / cells) * 45)}%, var(--ambient))`,
                color: idx === undefined ? "var(--text)" : "var(--accent-ink)",
                borderRight: right ? "5px solid var(--text)" : undefined,
                borderBottom: down ? "5px solid var(--text)" : undefined,
                transition: "background 80ms",
              }}
            >
              {checkpoints[c] || ""}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <button type="button" className="lite-opt font-label px-4 py-2 text-[13px]" onClick={() => !done.current && setPath(pathRef.current.slice(0, -1))}>
          UNDO
        </button>
        <button
          type="button"
          className="lite-opt font-label px-4 py-2 text-[13px]"
          onClick={() => {
            if (done.current || pathRef.current.length === 0) return;
            resets.current += 1;
            setPath([]);
          }}
        >
          CLEAR
        </button>
        <span className="font-label text-[12px] text-muted">
          {path.length}/{cells} · DRAG, TAP OR ARROW KEYS
        </span>
      </div>
    </div>
  );
}

function Trial({ trial, index, onDone }: { trial: TrialData; index: number; onDone: (r: TrialRun) => void }) {
  const started = useRef(performance.now());
  const finished = useRef(false);
  const [phase, setPhase] = useState<"play" | "won" | "lost">("play");
  const [now, setNow] = useState(0);
  const limitMs = trial.data.metadata.timeLimitSeconds * 1000;
  useEffect(() => {
    const t = setInterval(() => setNow(performance.now() - started.current), 250);
    return () => clearInterval(t);
  }, []);

  const finish = useCallback(
    (f: Finish) => {
      if (finished.current) return;
      finished.current = true;
      const ms = Math.round(performance.now() - started.current);
      setPhase(f.solved ? "won" : "lost");
      setTimeout(() => onDone({ kind: trial.kind, ms, ...f }), f.solved ? 650 : 1200);
    },
    [onDone, trial.kind],
  );
  const skip = useCallback(() => finish({ solved: false, answer: null, moves: 0, resets: 0 }), [finish]);

  return (
    <div className={`flex flex-col gap-5 ${phase === "won" ? "lite-solved" : ""}`}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[26px] leading-8 text-accent">
          {index + 1}/3 · {LABEL[trial.kind]}
        </h2>
        <span className="font-label tabular text-[14px] text-muted">
          {clock(now)} / {clock(limitMs)}
        </span>
      </div>
      <p className="text-[15px] leading-6 text-muted">{HELP[trial.kind]}</p>
      {trial.kind === "Pattern" && <PatternTrial data={trial.data} onFinish={finish} />}
      {trial.kind === "Spatial" && <SpatialTrial data={trial.data} onFinish={finish} />}
      {trial.kind === "Logic" && <LogicTrial data={trial.data} onFinish={finish} />}
      {phase === "play" && now >= limitMs && (
        <PixelButton variant="secondary" onClick={skip}>
          Skip
        </PixelButton>
      )}
      {phase === "won" && <p className="lite-pop font-label text-center text-[28px] text-accent-2">SOLVED</p>}
      {phase === "lost" && <p className="lite-pop font-label text-center text-[22px] text-[#ff3b5c]">NOT THAT ONE</p>}
    </div>
  );
}

const pts = (n: number) => n.toLocaleString("en-US");
const mark = (r: TrialRun) => (!r.solved ? "🟥" : r.resets === 0 ? "🟩" : "🟨");

/** Banks the finished run on the server (rating, streak, ranks) and then offers a handle for the board. */
function BankPanel({ day, runs, bank, onBanked }: { day: number; runs: TrialRun[]; bank: DailyBank | null; onBanked: (b: DailyBank) => void }) {
  const { ready, online, userId, profile, refresh } = useSession();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [nameErr, setNameErr] = useState<string | null>(null);
  const auto = useRef(false);
  const inflight = useRef(false);

  const bankIt = useCallback(async () => {
    // Guest sign-in inside bankDaily changes the session, which would otherwise start a second submit.
    if (inflight.current) return;
    inflight.current = true;
    auto.current = true;
    setBusy(true);
    setErr(null);
    try {
      onBanked(await bankDaily(day, runs));
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save the run.");
    } finally {
      inflight.current = false;
      setBusy(false);
    }
  }, [day, runs, onBanked, refresh]);

  // Already signed in on the site: no reason to ask, bank it.
  useEffect(() => {
    if (bank || auto.current || !ready || !online || !userId) return;
    void bankIt();
  }, [bank, ready, online, userId, bankIt]);

  useEffect(() => {
    if (!bank || !userId) return;
    let live = true;
    void fetchLeaderboard("daily", 200)
      .then((res) => {
        if (live && res.source === "live") setRank(res.data.find((r) => r.userId === userId)?.rank ?? null);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [bank, userId]);

  const saveName = async () => {
    const parsed = handleSchema.safeParse(name);
    if (!parsed.success) return setNameErr(parsed.error.issues[0]?.message ?? "Invalid handle");
    setNameErr(null);
    setBusy(true);
    try {
      await setHandle(parsed.data);
      await refresh();
    } catch (e) {
      setNameErr(e instanceof Error ? (/duplicate|unique|taken/i.test(e.message) ? "That handle is taken." : e.message) : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return null;

  if (!bank) {
    if (!online) {
      return <p className="text-[13px] leading-5 text-muted">Offline: this run stays on your device. Reload when you are back online to save it.</p>;
    }
    return (
      <div className="flex flex-col items-start gap-2 border-t-2 border-line pt-4">
        <PixelButton size="lg" onClick={() => void bankIt()} disabled={busy}>
          {busy ? "Saving…" : "Save to the board"}
        </PixelButton>
        <p className="text-[13px] leading-5 text-muted">
          {err ?? "Counts for rating and streak. No email, no password: a guest account is created on this device."}
        </p>
      </div>
    );
  }

  const delta = bank.ratingAfter - bank.ratingBefore;
  return (
    <div className="flex w-full flex-col gap-3 border-t-2 border-line pt-4">
      {bank.counted ? (
        <ul className="font-label flex flex-col gap-1 text-[14px]">
          <li className="text-accent-2">
            SCORE {pts(bank.points)}
            {rank !== null ? ` · #${rank} TODAY` : ""}
          </li>
          <li>
            RATING {bank.ratingBefore} → {bank.ratingAfter} ({delta >= 0 ? "+" : ""}
            {delta})
          </li>
          <li className="text-[#E8DA37]">
            STREAK {bank.streak} DAY{bank.streak === 1 ? "" : "S"}
          </li>
        </ul>
      ) : (
        <p className="font-label text-[13px] leading-5 text-muted">
          ALREADY COUNTED TODAY. THE FIRST RUN STANDS: SCORE {pts(bank.points)} · RATING {bank.ratingAfter} · STREAK {bank.streak}.
        </p>
      )}
      {!profile?.handle || /^p_[0-9a-f]{12}$/i.test(profile.handle) ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void saveName();
          }}
        >
          <label htmlFor="lite-handle" className="font-label text-[12px] text-muted">
            {profile?.handle ? `YOU ARE @${profile.handle}. PICK A NAME` : "PICK A NAME FOR THE BOARD"}
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="lite-handle"
              className="px-input"
              value={name}
              maxLength={20}
              autoComplete="username"
              spellCheck={false}
              placeholder="your_handle"
              onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
              aria-invalid={!!nameErr}
            />
            <PixelButton type="submit" disabled={busy || name.length < 3}>
              {busy ? "…" : "Save name"}
            </PixelButton>
          </div>
          {nameErr && <p className="text-[13px] text-danger">{nameErr}</p>}
        </form>
      ) : (
        <p className="font-label text-[12px] text-muted">PLAYING AS @{profile.handle}</p>
      )}
      <PixelButton href="/leaderboard" variant="secondary">
        See today&apos;s board
      </PixelButton>
    </div>
  );
}

export function LiteDaily() {
  const [day, setDay] = useState<number | null>(null);
  const [stage, setStage] = useState(-1); // -1 intro, 0..2 playing, 3 done
  const [runs, setRuns] = useState<TrialRun[]>([]);
  const [bank, setBank] = useState<DailyBank | null>(null);
  const [copied, setCopied] = useState(false);
  const [streak, setStreak] = useState(0);

  // Same day again: show the stored result instead of letting the run be replayed for a better time.
  useEffect(() => {
    const today = dayNumber(new Date());
    setDay(today);
    const saved = loadSaved();
    if (!saved || !Array.isArray(saved.runs)) return;
    if (saved.lastDay === today && saved.runs.length === 3) {
      setRuns(saved.runs);
      setBank(saved.bank ?? null);
      setStreak(saved.streak);
      setStage(3);
    } else setStreak(saved.lastDay === today - 1 ? saved.streak : 0);
  }, []);
  const plan = useMemo(() => (day === null ? null : dailyPlan(day)), [day]);
  const trials = useMemo(() => plan?.trials.map((t) => generateTrial(t.kind, t.seed, t.difficulty)) ?? [], [plan]);

  const finish = useCallback(
    (r: TrialRun) => {
      const next = [...runs, r];
      setRuns(next);
      if (next.length === 3 && day !== null) {
        const kept = streak + 1;
        setStreak(kept);
        save({ lastDay: day, streak: kept, runs: next, bank: null });
      }
      setStage((s) => s + 1);
    },
    [runs, day, streak],
  );

  const banked = useCallback(
    (reply: DailyBank) => {
      // A counted result is final: a later "already counted" reply must not replace it.
      const b = bank?.counted && !reply.counted ? bank : reply;
      setBank(b);
      if (day !== null) save({ lastDay: day, streak, runs, bank: b });
    },
    [bank, day, streak, runs],
  );

  const total = runs.reduce((s, r) => s + r.ms, 0);
  const grid = runs.map(mark).join("");
  const score = bank?.counted ? ` · ${pts(bank.points)} pts` : "";
  const shareText = `ODLET Daily #${String(day ?? 0).padStart(3, "0")}\n${grid} ${clock(total)}${score}\nodlet.io/daily/play`;

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ text: shareText });
      else {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* share dismissed or clipboard blocked: nothing to do */
    }
  };

  return (
    <div className="px-panel mx-auto flex max-w-[760px] flex-col gap-6 p-4 sm:p-6" data-accent="true">
      <style>{`
        .lite-opt{background:color-mix(in srgb,var(--ambient) 60%,#07080b);border:2px solid var(--line);color:var(--text);cursor:pointer}
        .lite-opt:hover:not(:disabled),.lite-opt:focus-visible{border-color:var(--accent)}
        .lite-opt[data-state="right"]{border-color:var(--accent-2);opacity:1}
        .lite-opt[data-state="wrong"]{border-color:#ff3b5c}
        .lite-opt[data-state="dim"]{opacity:.45}
        @keyframes lite-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
        @keyframes lite-pop{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.2);opacity:1}100%{transform:scale(1)}}
        @keyframes lite-glow{0%,100%{box-shadow:0 0 0 0 transparent}50%{box-shadow:0 0 28px 4px var(--accent)}}
        .lite-shake{animation:lite-shake .3s}
        .lite-pop{animation:lite-pop .35s}
        .lite-solved{animation:lite-glow .65s}
        @media (prefers-reduced-motion:reduce){.lite-shake,.lite-pop,.lite-solved{animation:none}}
      `}</style>

      {stage === -1 && (
        <div className="flex flex-col items-start gap-4">
          <p className="font-label text-[13px] text-muted">
            DAILY {day === null ? "---" : String(day).padStart(3, "0")} · THREE TRIALS · RESETS IN {day === null ? "--" : `${Math.floor(untilResetMs() / 3_600_000)}H ${Math.floor((untilResetMs() % 3_600_000) / 60_000)}M`}
          </p>
          <p className="max-w-[520px] text-[15px] leading-6 text-muted">
            Same puzzles for everyone today. Pattern, Spatial, Link. Plays right here, no download. One try each.
          </p>
          <PixelButton size="lg" onClick={() => setStage(0)} disabled={!plan}>
            <PixelIcon name="play" /> Start
          </PixelButton>
        </div>
      )}

      {stage >= 0 && stage < 3 && trials[stage] && <Trial key={stage} trial={trials[stage]} index={stage} onDone={finish} />}

      {stage === 3 && day !== null && (
        <div className="flex flex-col items-start gap-4">
          <h2 className="lite-pop text-[30px] leading-9 text-accent">{runs.every((r) => !r.solved) ? "DAILY DONE" : "DAILY CLEARED"}</h2>
          <ul className="font-label flex flex-col gap-1 text-[14px]">
            {runs.map((r, i) => (
              <li key={i}>
                {mark(r)} {LABEL[r.kind]} · {clock(r.ms)}
                {!r.solved ? " · MISSED" : r.resets > 0 ? ` · ${r.resets} restart${r.resets > 1 ? "s" : ""}` : ""}
              </li>
            ))}
            <li className="mt-2 text-accent-2">TOTAL {clock(total)}</li>
            {!bank && streak > 0 && <li className="text-[#E8DA37]">STREAK {streak} DAY{streak > 1 ? "S" : ""} (THIS DEVICE)</li>}
          </ul>
          <div className="flex flex-wrap gap-3">
            <PixelButton onClick={share}>{copied ? "Copied" : "Share"}</PixelButton>
            <PixelButton href="/play" variant="secondary">
              Full game
            </PixelButton>
          </div>
          <BankPanel day={day} runs={runs} bank={bank} onBanked={banked} />
        </div>
      )}
    </div>
  );
}

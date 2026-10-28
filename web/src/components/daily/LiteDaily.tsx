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

/**
 * Today's Daily, playable the moment the page loads: no Unity, no canvas, plain DOM/SVG over @ronriku/core.
 * It is also the fallback for TVs, fridges and any browser that cannot run the WebGL game.
 * Results stay on this device; streaks, ranks and rewards live in the full game.
 */

const LABEL: Record<TrialKind, string> = { Pattern: "PATTERN", Spatial: "SPATIAL", Logic: "LINK" };
const HELP: Record<TrialKind, string> = {
  Pattern: "Find the rule from the examples. Pick what the last grid becomes.",
  Spatial: "Turn the shape until its top-down shadow matches the target.",
  Logic: "Draw one path through every cell, from 1 up through the numbers in order.",
};

interface TrialResult {
  kind: TrialKind;
  ms: number;
  misses: number;
}

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const STORE_KEY = "odlet.lite.v1";
interface Saved {
  lastDay: number;
  streak: number;
  results: TrialResult[];
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

function PatternTrial({ data, onSolve, onMiss }: { data: Extract<TrialData, { kind: "Pattern" }>["data"]; onSolve: () => void; onMiss: () => void }) {
  const [wrong, setWrong] = useState<readonly number[]>([]);
  const [shake, setShake] = useState(0);
  const pick = useCallback(
    (option: number) => {
      if (validateTrial({ kind: "Pattern", data }, option)) onSolve();
      else {
        setWrong((w) => (w.includes(option) ? w : [...w, option]));
        setShake((n) => n + 1);
        onMiss();
      }
    },
    [data, onSolve, onMiss],
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
              data-wrong={wrong.includes(i)}
              disabled={wrong.includes(i)}
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

function SpatialTrial({ data, onSolve }: { data: Extract<TrialData, { kind: "Spatial" }>["data"]; onSolve: () => void }) {
  const [orientation, setOrientation] = useState(data.startOrientation);
  const moves = useRef<number[]>([]);
  const [count, setCount] = useState(0);
  const done = useRef(false);

  const move = useCallback(
    (m: number) => {
      if (done.current) return;
      moves.current.push(m);
      setCount(moves.current.length);
      setOrientation((o) => applyMove(o, m));
      if (validateTrial({ kind: "Spatial", data }, moves.current)) {
        done.current = true;
        onSolve();
      }
    },
    [data, onSolve],
  );

  useEffect(() => {
    const keys: Record<string, number> = { ArrowLeft: 0, ArrowRight: 1, ArrowUp: 2, ArrowDown: 3 };
    const onKey = (e: KeyboardEvent) => {
      const m = keys[e.key];
      if (m !== undefined) {
        e.preventDefault();
        move(m);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

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
      <p className="font-label text-[12px] text-muted">MOVES {count} · ARROW KEYS WORK</p>
    </div>
  );
}

function LogicTrial({ data, onSolve }: { data: Extract<TrialData, { kind: "Logic" }>["data"]; onSolve: () => void }) {
  const { size, checkpoints, walls } = data;
  const cells = size * size;
  const wallSet = useMemo(() => new Set(walls), [walls]);
  const [path, setPathState] = useState<number[]>([]);
  const pathRef = useRef<number[]>([]);
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
        onSolve();
      }
    },
    [blocked, cells, checkpoints, data, onSolve, setPath, size],
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
        <button type="button" className="lite-opt font-label px-4 py-2 text-[13px]" onClick={() => !done.current && setPath([])}>
          CLEAR
        </button>
        <span className="font-label text-[12px] text-muted">
          {path.length}/{cells} · DRAG, TAP OR ARROW KEYS
        </span>
      </div>
    </div>
  );
}

function Trial({ trial, index, onDone }: { trial: TrialData; index: number; onDone: (r: TrialResult) => void }) {
  const started = useRef(performance.now());
  const misses = useRef(0);
  const [flash, setFlash] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setNow(performance.now() - started.current), 250);
    return () => clearInterval(t);
  }, []);

  const solve = useCallback(() => {
    setFlash(true);
    const ms = Math.round(performance.now() - started.current);
    setTimeout(() => onDone({ kind: trial.kind, ms, misses: misses.current }), 650);
  }, [onDone, trial.kind]);
  const miss = useCallback(() => {
    misses.current += 1;
  }, []);

  return (
    <div className={`flex flex-col gap-5 ${flash ? "lite-solved" : ""}`}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[26px] leading-8 text-accent">
          {index + 1}/3 · {LABEL[trial.kind]}
        </h2>
        <span className="font-label tabular text-[14px] text-muted">{clock(now)}</span>
      </div>
      <p className="text-[15px] leading-6 text-muted">{HELP[trial.kind]}</p>
      {trial.kind === "Pattern" && <PatternTrial data={trial.data} onSolve={solve} onMiss={miss} />}
      {trial.kind === "Spatial" && <SpatialTrial data={trial.data} onSolve={solve} />}
      {trial.kind === "Logic" && <LogicTrial data={trial.data} onSolve={solve} />}
      {flash && <p className="lite-pop font-label text-center text-[28px] text-accent-2">SOLVED</p>}
    </div>
  );
}

export function LiteDaily() {
  const [day, setDay] = useState<number | null>(null);
  const [stage, setStage] = useState(-1); // -1 intro, 0..2 playing, 3 done
  const [results, setResults] = useState<TrialResult[]>([]);
  const [copied, setCopied] = useState(false);

  const [streak, setStreak] = useState(0);

  // Same day again: show the stored result instead of letting the run be replayed for a better time.
  useEffect(() => {
    const today = dayNumber(new Date());
    setDay(today);
    const saved = loadSaved();
    if (!saved) return;
    if (saved.lastDay === today) {
      setResults(saved.results);
      setStreak(saved.streak);
      setStage(3);
    } else setStreak(saved.lastDay === today - 1 ? saved.streak : 0);
  }, []);
  const plan = useMemo(() => (day === null ? null : dailyPlan(day)), [day]);
  const trials = useMemo(() => plan?.trials.map((t) => generateTrial(t.kind, t.seed, t.difficulty)) ?? [], [plan]);

  const finish = useCallback(
    (r: TrialResult) => {
      const next = [...results, r];
      setResults(next);
      if (next.length === 3 && day !== null) {
        const kept = streak + 1;
        setStreak(kept);
        save({ lastDay: day, streak: kept, results: next });
      }
      setStage((s) => s + 1);
    },
    [results, day, streak],
  );

  const total = results.reduce((s, r) => s + r.ms, 0);
  const grid = results.map((r) => (r.misses === 0 ? "🟩" : "🟨")).join("");
  const shareText = `ODLET Daily #${String(day ?? 0).padStart(3, "0")}\n${grid} ${clock(total)}\nodlet.io/daily/play`;

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
        .lite-opt[data-wrong="true"]{border-color:#ff3b5c;opacity:.45}
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
            Same puzzles for everyone today. Pattern, Spatial, Link. Plays right here, no download.
          </p>
          <PixelButton size="lg" onClick={() => setStage(0)} disabled={!plan}>
            <PixelIcon name="play" /> Start
          </PixelButton>
        </div>
      )}

      {stage >= 0 && stage < 3 && trials[stage] && <Trial key={stage} trial={trials[stage]} index={stage} onDone={finish} />}

      {stage === 3 && (
        <div className="flex flex-col items-start gap-4">
          <h2 className="lite-pop text-[30px] leading-9 text-accent">DAILY CLEARED</h2>
          <ul className="font-label flex flex-col gap-1 text-[14px]">
            {results.map((r, i) => (
              <li key={i}>
                {r.misses === 0 ? "🟩" : "🟨"} {LABEL[r.kind]} · {clock(r.ms)}
                {r.misses > 0 ? ` · ${r.misses} miss${r.misses > 1 ? "es" : ""}` : ""}
              </li>
            ))}
            <li className="mt-2 text-accent-2">TOTAL {clock(total)}</li>
            {streak > 0 && <li className="text-[#E8DA37]">STREAK {streak} DAY{streak > 1 ? "S" : ""} (THIS DEVICE)</li>}
          </ul>
          <div className="flex flex-wrap gap-3">
            <PixelButton onClick={share}>{copied ? "Copied" : "Share"}</PixelButton>
            <PixelButton href="/play" variant="secondary">
              Full game: streak and ranks
            </PixelButton>
          </div>
          <p className="text-[13px] leading-5 text-muted">This run stays on your device. Open the full game to bank your streak and climb the board.</p>
        </div>
      )}
    </div>
  );
}

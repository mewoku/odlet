/**
 * Site-side volume for the Unity WebGL game, with no Unity rebuild needed: before the Unity loader runs,
 * AudioContext is wrapped so every context's `destination` is a master GainNode feeding the real
 * output. Unity's WebAudio backend connects all its voices to `destination`, so this one gain scales
 * music and SFX together. Settings persist per browser (localStorage, best effort).
 */

const KEY = "odlet.volume";
/** Unity's own mix is loud on laptop speakers; start the site at half. */
export const DEFAULT_VOLUME = 0.5;

export interface VolumeState {
  volume: number; // 0..1
  muted: boolean;
}

const gains = new Set<GainNode>();
let state: VolumeState | null = null;

export function readVolume(): VolumeState {
  if (state) return state;
  state = { volume: DEFAULT_VOLUME, muted: false };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<VolumeState>;
      if (typeof v.volume === "number" && v.volume >= 0 && v.volume <= 1) state.volume = v.volume;
      if (typeof v.muted === "boolean") state.muted = v.muted;
    }
  } catch {
    // private mode / blocked storage: defaults
  }
  return state;
}

function level(s: VolumeState): number {
  // Perceptual curve: the slider's midpoint sounds like "half as loud".
  return s.muted ? 0 : s.volume * s.volume;
}

export function setVolume(next: VolumeState) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  for (const g of gains) {
    try {
      g.gain.setTargetAtTime(level(next), g.context.currentTime, 0.03);
    } catch {
      g.gain.value = level(next);
    }
  }
}

type Ctor = typeof AudioContext;

/** Idempotent. Call before the Unity loader script is injected. */
export function installMasterGain() {
  if (typeof window === "undefined") return;
  const w = window as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor; __odletAudio?: boolean };
  if (w.__odletAudio) return;
  w.__odletAudio = true;
  const wrap = (Orig: Ctor | undefined): Ctor | undefined => {
    if (!Orig) return Orig;
    class OdletAudioContext extends Orig {
      constructor(...args: ConstructorParameters<Ctor>) {
        super(...args);
        try {
          const real = super.destination;
          const master = this.createGain();
          master.gain.value = level(readVolume());
          master.connect(real);
          // Unity reads maxChannelCount off destination; a GainNode doesn't have it.
          Object.defineProperty(master, "maxChannelCount", { get: () => real.maxChannelCount });
          Object.defineProperty(this, "destination", { value: master, configurable: true });
          gains.add(master);
          this.addEventListener?.("statechange", () => {
            if (this.state === "closed") gains.delete(master);
          });
        } catch {
          // fall back to the untouched context
        }
      }
    }
    return OdletAudioContext as unknown as Ctor;
  };
  w.AudioContext = wrap(w.AudioContext);
  if (w.webkitAudioContext) w.webkitAudioContext = wrap(w.webkitAudioContext);
}

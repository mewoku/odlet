import { TIPS } from "@/lib/tips";

/**
 * Branded route-transition screen (app/loading.tsx). Pure CSS animation (globals.css .ld-*), so it
 * works before/without hydration; prefers-reduced-motion shows a static frame and the first tip.
 */
export function LoadingScreen({ label = "Loading" }: { label?: string }) {
  const tips = TIPS.slice(0, 6);
  return (
    <div role="status" aria-live="polite" className="flex min-h-[70vh] flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <span className="sr-only">{label}…</span>
      <VoxelSpinner />
      <p
        aria-hidden="true"
        className="font-pixel text-[40px] leading-[40px] text-teal md:text-[56px] md:leading-[56px]"
        style={{ textShadow: "0 4px 0 #135b73, 0 8px 0 #0b3b4a, 0 0 24px rgb(17 197 179 / 0.4)" }}
      >
        ODLET
      </p>
      <div aria-hidden="true" className="w-full max-w-[320px]">
        <div className="px-border grid h-5 grid-cols-12 gap-[2px] bg-bg-0 p-[3px]">
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} className="ld-cell" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
        <p className="mt-3 font-label text-[12px] text-muted uppercase">
          {label}
          <span className="px-blink">_</span>
        </p>
      </div>
      <div className="relative h-12 w-full max-w-[460px]" aria-hidden="true">
        {tips.map((t, i) => (
          <p
            key={t}
            className="ld-tip absolute inset-0 text-[15px] leading-6 text-muted"
            style={{ animationDelay: `${i * 4}s` }}
          >
            <span className="font-label text-[12px] text-yellow">TIP · </span>
            {t}
          </p>
        ))}
      </div>
    </div>
  );
}

/** Isometric pixel cube that hops and flips colour faces. */
function VoxelSpinner() {
  return (
    <svg aria-hidden="true" width="96" height="96" viewBox="0 0 24 24" shapeRendering="crispEdges" className="ld-cube">
      <polygon className="ld-face-top" points="12,3 20,7 12,11 4,7" />
      <polygon className="ld-face-left" points="4,7 12,11 12,21 4,17" />
      <polygon className="ld-face-right" points="20,7 12,11 12,21 20,17" />
      <rect className="ld-core" x="10" y="6" width="4" height="2" />
    </svg>
  );
}

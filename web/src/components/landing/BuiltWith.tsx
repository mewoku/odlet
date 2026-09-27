/* eslint-disable @next/next/no-img-element -- partner logos are tiny self-hosted files; next/image adds nothing here */
import { SectionTitle } from "../ui/PixelPanel";
import { BUILT_WITH, visiblePartners } from "@/lib/partners";

/**
 * "Partners & built with". The tech row is labelled honestly as "Built with" (no partnership claim,
 * monochrome text badges, no third-party logos). The Partners row appears only when lib/partners.ts
 * lists real partners.
 */
export function BuiltWith() {
  const partners = visiblePartners();
  return (
    <section className="mx-auto max-w-[1200px] px-4 py-12" aria-labelledby="built-with-title">
      <SectionTitle kicker={partners.length ? "Partners & built with" : "Under the hood"} title="Built with" />
      <span id="built-with-title" className="sr-only">
        {partners.length ? "Partners and technology" : "Technology we build with"}
      </span>

      {partners.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-3 font-pixel text-[12px] text-yellow uppercase">Partners</h3>
          <ul className="flex flex-wrap gap-4">
            {partners.map((p) => (
              <li key={p.name}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-panel flex min-h-16 items-center gap-3 px-4 py-3 hover:brightness-125"
                >
                  {p.logo && <img src={p.logo} alt="" width={32} height={32} className="pixelated size-8 object-contain" />}
                  <span className="flex flex-col">
                    <span className="font-pixel text-[14px] leading-5 text-text uppercase">{p.name}</span>
                    {p.note && <span className="text-[12px] leading-4 text-muted">{p.note}</span>}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Built with">
        {BUILT_WITH.map((b) => (
          <li key={b.name} className="px-panel dither-bg flex flex-col gap-1 p-4">
            <span className="font-pixel text-[14px] leading-5 text-text uppercase">{b.name}</span>
            <span className="text-[12px] leading-4 text-muted">{b.role}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 font-pixel text-[10px] leading-4 text-muted">
        Names are trademarks of their owners. Listed as technology we use — not an endorsement or partnership.
      </p>
    </section>
  );
}

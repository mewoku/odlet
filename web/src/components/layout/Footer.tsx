import Link from "next/link";
import { Logo } from "./Nav";
import { publicEnv } from "@/lib/env";

const GAME_LINKS = [
  { href: "/play", label: "Play" },
  { href: "/daily", label: "Daily" },
  { href: "/bosses", label: "Bosses" },
  { href: "/market", label: "Market" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/friends", label: "Friends" },
] as const;

const ACCOUNT_LINKS = [
  { href: "/me", label: "My profile" },
  { href: "/inventory", label: "Collection" },
  { href: "/login", label: "Account" },
] as const;

function ColTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`mb-3 font-label text-[12px] leading-4 text-yellow uppercase ${className}`}>{children}</h2>;
}

const linkCls = "font-label text-[13px] leading-4 uppercase text-muted hover:text-text focus-visible:text-text";

/** Site-wide pixel footer (rendered once in app/layout.tsx). */
export function SiteFooter() {
  const { social, contactEmail } = publicEnv;
  const community = [
    { href: social.x, label: "X" },
    { href: social.discord, label: "Discord" },
    { href: social.telegram, label: "Telegram" },
  ].filter((c) => c.href);
  const year = new Date().getUTCFullYear();

  return (
    <footer className="relative mt-8 border-t-2 border-line bg-[rgb(7_8_11/0.88)] pb-[104px] md:pb-8" aria-label="Site footer">
      {/* dithered top edge */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 -top-[10px] h-2"
        style={{
          background: "var(--bg-0)",
          maskImage: "conic-gradient(#000 25%, transparent 0 50%, #000 0 75%, transparent 0)",
          maskSize: "4px 4px",
          WebkitMaskImage: "conic-gradient(#000 25%, transparent 0 50%, #000 0 75%, transparent 0)",
          WebkitMaskSize: "4px 4px",
        }}
      />
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-x-6 gap-y-8 px-4 pt-10 sm:grid-cols-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.3fr]">
        <div className="col-span-2 flex flex-col gap-3 sm:col-span-3 lg:col-span-1">
          <Logo size={20} />
          <p className="font-label text-[15px] leading-5 text-teal" style={{ textShadow: "0 2px 0 #135b73" }}>
            SOLVE TO STRIKE
          </p>
          <p className="max-w-[300px] text-[15px] leading-5 text-muted">Pixel puzzle combat. Every card is a puzzle; every solve is a hit.</p>
        </div>

        <nav aria-label="Game">
          <ColTitle>Game</ColTitle>
          <ul className="flex flex-col gap-3">
            {GAME_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkCls}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Account and legal">
          <ColTitle>You</ColTitle>
          <ul className="flex flex-col gap-3">
            {ACCOUNT_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkCls}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <ColTitle className="mt-6">Legal</ColTitle>
          <ul className="flex flex-col gap-3">
            <li>
              <Link href="/privacy" className={linkCls}>
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className={linkCls}>
                Terms
              </Link>
            </li>
            <li>
              <Link href="/delete-account" className={linkCls}>
                Delete account
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <ColTitle>Community</ColTitle>
          {community.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {community.map((c) => (
                <li key={c.label}>
                  <a href={c.href} target="_blank" rel="noopener noreferrer" className={linkCls}>
                    {c.label} <span aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] leading-5 text-muted">Channels open soon.</p>
          )}
          {contactEmail && (
            <p className="mt-6 flex flex-col gap-1">
              <span className="font-label text-[12px] text-yellow uppercase">Contact</span>
              <a href={`mailto:${contactEmail}`} className="break-all text-[15px] leading-5 text-text hover:text-teal">
                {contactEmail}
              </a>
            </p>
          )}
        </div>

        <div className="col-span-2 flex flex-col items-start gap-3 sm:col-span-1">
          <ColTitle>Mobile</ColTitle>
          <div
            className="px-border flex items-center gap-3 bg-bg-0 px-3 py-2"
            style={{ ["--pb" as string]: "var(--line)" }}
            aria-label="Solana dApp Store listing: coming soon"
            role="img"
          >
            <span aria-hidden="true" className="grid size-8 place-items-center bg-surface-2 font-label text-[15px] text-teal">
              ◆
            </span>
            <span className="flex flex-col">
              <span className="font-label text-[12px] leading-3 text-muted uppercase">Get it on the</span>
              <span className="font-label text-[13px] leading-4 text-text uppercase">Solana dApp Store</span>
            </span>
          </div>
          <span className="font-label text-[12px] text-yellow uppercase">Coming soon · Seeker</span>
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-[1200px] flex-col gap-2 border-t-2 border-line px-4 pt-6 font-label text-[12px] leading-4 text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>© {year} ODLET · odlet.xyz</span>
        <span>Early access · collectibles on Solana devnet (test SOL, no real funds)</span>
        <span>Fonts: Silkscreen, Pixelify Sans (OFL)</span>
      </div>
    </footer>
  );
}

import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Silkscreen } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { BottomNav, SiteHeader } from "@/components/layout/Nav";
import { SiteFooter } from "@/components/layout/Footer";
import { PendingPurchases } from "@/components/wallet/PendingPurchases";
import { headers } from "next/headers";
import { publicEnv } from "@/lib/env";

const silkscreen = Silkscreen({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-silkscreen", display: "swap" });
// Pixel lettering (Silkscreen) is for big display text only; everything people read runs in Chakra Petch.
const chakra = Chakra_Petch({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-chakra", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: { default: "Odlet — daily pixel reasoning", template: "%s · Odlet" },
  description: "Three reasoning trials a day, an adventure of voxel monsters and bosses, and collectible voxel figures on Solana devnet.",
  applicationName: "Odlet",
  openGraph: { title: "Odlet", siteName: "Odlet", description: "Pixel reasoning game for Solana Seeker and the web.", type: "website", url: "/" },
  twitter: { card: "summary", title: "Odlet", description: "Pixel reasoning game for Solana Seeker and the web." },
};

export const viewport: Viewport = {
  themeColor: "#07080B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading the request headers makes every page render per request, so Next can stamp the CSP
  // nonce set by middleware.ts onto its scripts (no script 'unsafe-inline').
  await headers();
  return (
    <html lang="en" className={`${silkscreen.variable} ${chakra.variable}`}>
      <body>
        <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-yellow focus:px-3 focus:py-2 focus:text-bg-0">
          Skip to content
        </a>
        <Providers>
          <SiteHeader />
          <PendingPurchases />
          <div id="content">{children}</div>
          <SiteFooter />
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}

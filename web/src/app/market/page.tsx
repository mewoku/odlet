import type { Metadata } from "next";
import { PageHeader, PageShell } from "@/components/layout/PageShell";
import { MarketView } from "@/components/market/MarketView";
import { MarketComingSoon } from "@/components/market/MarketComingSoon";
import { publicEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Market" };

export default function MarketPage() {
  return (
    <PageShell palette="link" wide>
      <PageHeader kicker="Shop" title="Figures" />
      {publicEnv.marketOpen ? <MarketView /> : <MarketComingSoon />}
    </PageShell>
  );
}

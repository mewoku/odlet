import type { Metadata } from "next";
import { PageHeader, PageShell } from "@/components/layout/PageShell";
import { LiteDaily } from "@/components/daily/LiteDaily";

export const metadata: Metadata = {
  title: "Play today's Daily",
  description: "Three logic trials, the same for everyone, playable instantly in your browser.",
};

export default function PlayDailyPage() {
  return (
    <PageShell palette="pattern">
      <PageHeader kicker="Daily" title="Play now" />
      <LiteDaily />
    </PageShell>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { MeTabs } from "@/components/layout/MeTabs";
import { ProfileView } from "@/components/profile/ProfileView";
import { handleSchema } from "@/lib/validation";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const h = decodeURIComponent(handle).slice(0, 20);
  return {
    title: `@${h}`,
    description: `@${h} on Odlet: rating, streak, adventure progress and voxel figure collection.`,
    openGraph: { title: `@${h} · Odlet`, url: `/u/${encodeURIComponent(h)}` },
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const parsed = handleSchema.safeParse(decodeURIComponent(handle));
  if (!parsed.success) notFound();
  return (
    <PageShell palette="frost">
      <MeTabs />
      <ProfileView handle={parsed.data} />
    </PageShell>
  );
}

import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { MeRedirect } from "@/components/profile/ProfileView";

export const metadata: Metadata = { title: "My profile", robots: { index: false } };

/** /me → your own /u/<handle> (or /login when signed out). Handy, stable link for the ME tab. */
export default function MePage() {
  return (
    <PageShell palette="frost">
      <MeRedirect />
    </PageShell>
  );
}

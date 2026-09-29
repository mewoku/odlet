import type { Metadata } from "next";
import { PageHeader, PageShell } from "@/components/layout/PageShell";
import { Contact, LegalList, LegalSection, Strong } from "@/components/legal/Legal";
import { DeleteAccountButton } from "@/components/legal/DeleteAccountButton";

export const metadata: Metadata = {
  title: "Delete your account",
  description: "How to delete your Odlet account and everything linked to it.",
};

/** The web deletion link Google Play asks for; the in-app path is ME → SETTINGS → DELETE ACCOUNT. */
export default function DeleteAccountPage() {
  return (
    <PageShell palette="lab">
      <PageHeader kicker="Account" title="Delete your account" />
      <div className="mx-auto max-w-[720px] space-y-6">
        <LegalSection id="app" title="In the app">
          <p>
            Open the <Strong>ME</Strong> tab, scroll to <Strong>SETTINGS</Strong> and tap <Strong>DELETE ACCOUNT</Strong> twice. The phone needs an
            internet connection so the server copy is deleted too.
          </p>
        </LegalSection>

        <LegalSection id="web" title="On this website">
          <p>If you play in this browser, you can delete that account here:</p>
          <DeleteAccountButton />
        </LegalSection>

        <LegalSection id="email" title="By email">
          <p>
            Lost the device? Write to <Contact /> with your player handle (shown on the ME tab). We delete the account within 30 days.
          </p>
        </LegalSection>

        <LegalSection id="what" title="What is deleted">
          <LegalList
            items={[
              <>Your profile: handle, rating, streak, shards and level progress.</>,
              <>Daily results, boss attempts, friend links, market listings you created and your purchase history.</>,
              <>A linked wallet address. Figures already minted on the blockchain stay on-chain and cannot be removed by us.</>,
            ]}
          />
          <p>Deletion is immediate and cannot be undone. Nothing is kept afterwards.</p>
        </LegalSection>
      </div>
    </PageShell>
  );
}

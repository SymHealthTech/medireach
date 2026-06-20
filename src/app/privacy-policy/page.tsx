import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { GrievanceForm } from "@/components/site/GrievanceForm";
import { getContent } from "@/lib/content";

export const metadata: Metadata = { title: "Privacy Policy — MediReach" };

// Always reflect the latest admin-edited content.
export const dynamic = "force-dynamic";

/**
 * Privacy Policy (spec §4, §15.8, §15.10) — admin-editable content with a
 * standalone, plain-language notice and an easy grievance/withdrawal channel.
 */
export default async function PrivacyPolicyPage() {
  const { title, body } = await getContent("privacy-policy");
  return (
    <div className="bg-surface">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-3xl font-bold text-ink">{title}</h1>
        <div className="mt-6 space-y-4">
          {body.split("\n").map((line, i) =>
            line.trim() ? (
              <p key={i} className="text-ink-muted">{line}</p>
            ) : (
              <div key={i} className="h-1" />
            ),
          )}
        </div>
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold text-ink">Your data rights</h2>
          <GrievanceForm />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

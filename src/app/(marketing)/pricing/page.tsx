import type { Metadata } from "next";
import { LeadForm } from "@/components/marketing/LeadForm";
import { PageIntro } from "@/components/marketing/PageIntro";
import { FaqList, PricingCards, SectionTitle } from "@/components/marketing/Sections";
import { FAQ } from "@/content/marketing";
import { getPublicSiteData, rupees } from "@/lib/public/site-data";
import { absUrl } from "@/lib/site";

export const revalidate = 600;

export const metadata: Metadata = {
  title: { absolute: "Pricing – MediReach" },
  description: "One-time pricing for a doctor's website and visiting card. Founding Doctors get free hosting forever.",
  alternates: { canonical: absUrl("/pricing") },
};

export default async function PricingPage() {
  const site = await getPublicSiteData();
  return (
    <main>
      <PageIntro eyebrow="Pricing" title="One payment. Your page and card, done.">
        <p>
          From {rupees(Math.min(site.prices.gp, site.prices.consultant))}, one time, for your page and visiting card. Your content always stays
          yours.
        </p>
      </PageIntro>
      <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-6">
        <PricingCards site={site} />
      </section>
      <section className="bg-surface px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <SectionTitle className="mb-8">Pricing questions</SectionTitle>
          <FaqList items={FAQ.items.filter((f) => /hosting|domain|change|long/i.test(f.q))} />
        </div>
      </section>
      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl rounded-xl border border-line bg-surface p-6 shadow-soft sm:p-8">
          <SectionTitle className="mb-6 !text-2xl">Want us to call you?</SectionTitle>
          <LeadForm source="pricing" />
        </div>
      </section>
    </main>
  );
}

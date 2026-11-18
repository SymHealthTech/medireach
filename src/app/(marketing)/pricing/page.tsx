import type { Metadata } from "next";
import { Check, Clock, Plus, Users } from "lucide-react";
import { LeadPanel } from "@/components/marketing/ProductPage";
import { PageIntro } from "@/components/marketing/PageIntro";
import { FaqList, PricingCards, SectionTitle } from "@/components/marketing/Sections";
import { FAQ, PRICING_PAGE } from "@/content/marketing";
import { getPublicSiteData, rupees } from "@/lib/public/site-data";
import { absUrl } from "@/lib/site";

export const revalidate = 600;

export const metadata: Metadata = {
  title: { absolute: "Pricing – MediReach" },
  description:
    "Pricing for doctor portfolios, clinic websites and small hospital websites. Setup once, yearly renewal from year 2, digital visiting card included.",
  alternates: { canonical: absUrl("/pricing") },
};

const PRICING_FAQ = /every year|own domain|change timings|4 doctors/i;

/** /pricing: every price from Settings; nothing hard-coded. */
export default async function PricingPage() {
  const site = await getPublicSiteData();
  const p = site.prices;
  const from = rupees(Math.min(p.doctorSetup, p.clinicSetup, p.hospitalSetup));

  return (
    <main>
      <PageIntro eyebrow={PRICING_PAGE.eyebrow} title={PRICING_PAGE.title}>
        <p>{PRICING_PAGE.intro.replace("{from}", from)}</p>
      </PageIntro>

      <section className="mx-auto max-w-content px-4 pb-20 sm:px-6">
        <h2 className="sr-only">Plans</h2>
        <PricingCards site={site} />
      </section>

      <section aria-labelledby="renewal-title" className="bg-surface px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto grid max-w-content gap-10 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <SectionTitle id="renewal-title" className="!text-[28px] lg:!text-[34px]">
              {PRICING_PAGE.renewalTitle}
            </SectionTitle>
            <ul className="mt-6 space-y-3">
              {PRICING_PAGE.renewalCovers.map((x) => (
                <li key={x} className="flex gap-3 text-body">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-leaf/15 text-leaf">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                  {x}
                </li>
              ))}
            </ul>
            <h3 className="mt-10 font-display text-xl font-semibold text-ink">{PRICING_PAGE.extrasTitle}</h3>
            <ul className="mt-4 space-y-3">
              {PRICING_PAGE.extras.map((x) => (
                <li key={x} className="flex gap-3 text-body">
                  <Plus className="mt-1 size-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                  {x.replace("{update}", rupees(p.updatePrice))}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-5">
            <div className="rounded-2xl border border-line bg-paper p-6">
              <h3 className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
                <Users className="size-5 text-lagoon" strokeWidth={1.75} /> {PRICING_PAGE.doctorsTitle}
              </h3>
              <p className="mt-2 text-body">
                {PRICING_PAGE.doctorsText.replace("{addon}", rupees(p.doctorAddon)).replace("{renewal}", rupees(p.renewalDoctor))}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-paper p-6">
              <h3 className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
                <Clock className="size-5 text-lagoon" strokeWidth={1.75} /> {PRICING_PAGE.lapseTitle}
              </h3>
              <p className="mt-2 text-body">{PRICING_PAGE.lapseText.replace("{days}", String(site.renewalGraceDays))}</p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="pricing-faq" className="px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-3xl">
          <SectionTitle id="pricing-faq" className="mb-8">
            {PRICING_PAGE.faqTitle}
          </SectionTitle>
          <FaqList items={FAQ.items.filter((f) => PRICING_FAQ.test(f.q))} />
        </div>
      </section>

      <LeadPanel title={PRICING_PAGE.formTitle} source="pricing" />
    </main>
  );
}

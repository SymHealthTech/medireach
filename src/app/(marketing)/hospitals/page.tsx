import type { Metadata } from "next";
import { Check } from "lucide-react";
import { LeadForm } from "@/components/marketing/LeadForm";
import { PageIntro } from "@/components/marketing/PageIntro";
import { SectionTitle } from "@/components/marketing/Sections";
import { WhatsAppIcon, WhatsAppLink } from "@/components/marketing/WhatsAppLink";
import { HOSPITALS, WHATSAPP_TEXT } from "@/content/marketing";
import { getPublicSiteData, whatsappHref } from "@/lib/public/site-data";
import { absUrl } from "@/lib/site";

export const revalidate = 600;

export const metadata: Metadata = {
  title: { absolute: "For hospitals – MediReach" },
  description: "Professional pages and visiting cards for every visiting consultant at your hospital, with their days and timings.",
  alternates: { canonical: absUrl("/hospitals") },
};

export default async function HospitalsPage() {
  const site = await getPublicSiteData();
  return (
    <main>
      <PageIntro eyebrow="For hospitals" title={HOSPITALS.title}>
        <p>{HOSPITALS.text}</p>
      </PageIntro>
      <section className="mx-auto grid max-w-content gap-10 px-4 pb-20 sm:px-6 lg:grid-cols-2">
        <div className="space-y-6">
          <ul className="space-y-4">
            {HOSPITALS.points.map((p) => (
              <li key={p} className="flex gap-3 text-lg text-body">
                <Check className="mt-1 size-5 shrink-0 text-leaf" strokeWidth={2} />
                {p}
              </li>
            ))}
          </ul>
          <WhatsAppLink
            href={whatsappHref(site.whatsappNumber, WHATSAPP_TEXT.hospital)}
            placement="hospitals"
            className="inline-flex min-h-12 items-center gap-2 rounded-[10px] bg-ink px-6 font-semibold text-paper hover:bg-ink-700 active:scale-[.98]"
          >
            <WhatsAppIcon className="size-5" /> Talk to us on WhatsApp
          </WhatsAppLink>
        </div>
        <div className="rounded-xl border border-line bg-surface p-6 shadow-soft sm:p-8">
          <SectionTitle className="mb-6 !text-2xl">Tell us about your hospital</SectionTitle>
          <LeadForm source="hospitals" submitLabel="Send" />
        </div>
      </section>
    </main>
  );
}

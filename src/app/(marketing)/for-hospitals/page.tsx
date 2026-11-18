import type { Metadata } from "next";
import { Siren } from "lucide-react";
import { LaptopFrame, PhoneFrame } from "@/components/home/Frames";
import { MiniSiteLaptop, MiniSitePhone, toMiniSite } from "@/components/home/MiniSite";
import { MultiDoctorDiagram } from "@/components/home/Sections";
import { FloatingWhatsApp } from "@/components/marketing/FloatingWhatsApp";
import { HowItWorksSection, IncludedGrid, LeadPanel, ProductHero } from "@/components/marketing/ProductPage";
import { Reveal } from "@/components/marketing/Reveal";
import { FaqList, SectionTitle } from "@/components/marketing/Sections";
import { FAQ, FOR_HOSPITALS } from "@/content/marketing";
import { SAMPLE_SITES } from "@/fixtures/sample-sites";
import { getPublicSiteData, rupees, whatsappHref } from "@/lib/public/site-data";
import { absUrl, ROOT_HOSTNAME } from "@/lib/site";

export const revalidate = 600;

export const metadata: Metadata = {
  title: { absolute: "Websites for small hospitals up to 10 beds – MediReach" },
  description:
    "A complete website for hospitals up to 10 beds: departments, doctors by department, facilities, beds, insurance/TPA list and a 24×7 contact bar. Digital visiting card included.",
  alternates: { canonical: absUrl("/for-hospitals") },
};

const SHARED_FAQ = /NMC|every year|own domain/i;

export default async function ForHospitalsPage() {
  const site = await getPublicSiteData();
  const p = site.prices;
  const wa = whatsappHref(site.whatsappNumber, FOR_HOSPITALS.whatsapp);
  const hospital = toMiniSite(SAMPLE_SITES["small-hospital"]);

  return (
    <main>
      <ProductHero
        eyebrow={FOR_HOSPITALS.eyebrow}
        title={FOR_HOSPITALS.title}
        text={FOR_HOSPITALS.text}
        price={FOR_HOSPITALS.price.replace("{setup}", rupees(p.hospitalSetup)).replace("{renewal}", rupees(p.renewalHospital))}
        waHref={wa}
        waPlacement="for_hospitals_hero"
        primaryCta={FOR_HOSPITALS.primaryCta}
        secondary={{ href: "/designs/small-hospital", label: FOR_HOSPITALS.secondaryCta }}
        visual={
          <div className="relative pb-10 pr-12 sm:pr-20">
            <LaptopFrame url={`yourhospital.${ROOT_HOSTNAME}`}>
              <MiniSiteLaptop site={hospital} />
            </LaptopFrame>
            <div className="float-gentle absolute bottom-0 right-0">
              <PhoneFrame scale={0.5}>
                <MiniSitePhone site={hospital} />
              </PhoneFrame>
            </div>
            <span
              aria-hidden
              className="float-gentle absolute -top-4 left-2 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-soft ring-1 ring-line"
            >
              <Siren className="size-3.5 text-clay" strokeWidth={2} /> 24×7 Emergency
            </span>
          </div>
        }
      />

      <IncludedGrid title={FOR_HOSPITALS.includedTitle} items={FOR_HOSPITALS.included} />

      <Reveal as="section" aria-labelledby="consultants-title" className="bg-sage px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto grid max-w-content items-center gap-12 lg:grid-cols-2">
          <div className="space-y-5">
            <SectionTitle id="consultants-title">{FOR_HOSPITALS.consultantsTitle}</SectionTitle>
            <p className="text-lg text-body/85">{FOR_HOSPITALS.consultantsText.replace("{addon}", rupees(p.doctorAddon))}</p>
          </div>
          <div data-reveal-item>
            <MultiDoctorDiagram centre="Your hospital website" />
          </div>
        </div>
      </Reveal>

      <HowItWorksSection />

      <Reveal as="section" aria-labelledby="faq-title" className="bg-surface px-4 py-20 sm:px-6 lg:py-28">
        <div className="mx-auto max-w-3xl">
          <SectionTitle id="faq-title" className="mb-8 text-center">
            {FOR_HOSPITALS.faqTitle}
          </SectionTitle>
          <FaqList items={[...FOR_HOSPITALS.faq, ...FAQ.items.filter((f) => SHARED_FAQ.test(f.q))]} />
        </div>
      </Reveal>

      <LeadPanel title={FOR_HOSPITALS.formTitle} source="hospitals" />
      <FloatingWhatsApp href={wa} watchId="hero-cta" />
    </main>
  );
}

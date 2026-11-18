import type { Metadata } from "next";
import { DesignShowcase } from "@/components/home/DesignShowcase";
import { LaptopFrame, PhoneFrame } from "@/components/home/Frames";
import { MiniSiteLaptop, MiniSitePhone, toMiniSite } from "@/components/home/MiniSite";
import { MotionRoot } from "@/components/home/MotionRoot";
import { MultiDoctorDiagram } from "@/components/home/Sections";
import { FloatingWhatsApp } from "@/components/marketing/FloatingWhatsApp";
import { HowItWorksSection, IncludedGrid, LeadPanel, ProductHero } from "@/components/marketing/ProductPage";
import { Reveal } from "@/components/marketing/Reveal";
import { FaqList, SectionTitle } from "@/components/marketing/Sections";
import { FAQ, FOR_CLINICS, MULTI_DOCTOR, PRICING_PAGE } from "@/content/marketing";
import { SAMPLE_SITES } from "@/fixtures/sample-sites";
import { getPublicSiteData, rupees, whatsappHref } from "@/lib/public/site-data";
import { absUrl, ROOT_HOSTNAME } from "@/lib/site";
import { SPECIALTY_THEMES } from "@/themes/specialty";

export const revalidate = 600;

export const metadata: Metadata = {
  title: { absolute: "Clinic websites designed for your specialty – MediReach" },
  description:
    "A complete clinic website with your doctors, services, timings and location, in a design made for your specialty. Digital visiting card included. Built for the NMC advertising guidelines.",
  alternates: { canonical: absUrl("/for-clinics") },
};

const CLINIC_FAQ = /NMC|same design|4 doctors|change timings|own domain/i;

export default async function ForClinicsPage() {
  const site = await getPublicSiteData();
  const p = site.prices;
  const wa = whatsappHref(site.whatsappNumber, FOR_CLINICS.whatsapp);
  const clinicSites = SPECIALTY_THEMES.filter((t) => t.kind === "clinic").map((t) => toMiniSite(SAMPLE_SITES[t.key]));
  const hero = clinicSites.find((s) => s.themeKey === "dental") ?? clinicSites[0]!;

  return (
    <MotionRoot>
      <main>
        <ProductHero
          eyebrow={FOR_CLINICS.eyebrow}
          title={FOR_CLINICS.title}
          text={FOR_CLINICS.text}
          price={FOR_CLINICS.price.replace("{setup}", rupees(p.clinicSetup)).replace("{renewal}", rupees(p.renewalClinic))}
          waHref={wa}
          waPlacement="for_clinics_hero"
          primaryCta={FOR_CLINICS.primaryCta}
          secondary={{ href: "#designs", label: FOR_CLINICS.secondaryCta }}
          visual={
            <div className="relative pb-10 pr-12 sm:pr-20">
              <LaptopFrame url={`yourclinic.${ROOT_HOSTNAME}`}>
                <MiniSiteLaptop site={hero} />
              </LaptopFrame>
              <div className="float-gentle absolute bottom-0 right-0">
                <PhoneFrame scale={0.5}>
                  <MiniSitePhone site={hero} />
                </PhoneFrame>
              </div>
            </div>
          }
        />

        <IncludedGrid title={FOR_CLINICS.includedTitle} items={FOR_CLINICS.included} />

        <Reveal as="section" aria-labelledby="designs-title" className="bg-paper px-4 py-20 sm:px-6 lg:py-28">
          <div id="designs" className="mx-auto max-w-content scroll-mt-20">
            <div className="mb-10 text-center">
              <SectionTitle id="designs-title">{FOR_CLINICS.designsTitle}</SectionTitle>
              <p className="mx-auto mt-3 max-w-xl text-lg text-body/85">{FOR_CLINICS.designsText}</p>
            </div>
            <DesignShowcase sites={clinicSites} />
          </div>
        </Reveal>

        <Reveal as="section" aria-labelledby="multi-title" className="bg-sage px-4 py-20 sm:px-6 lg:py-28">
          <div className="mx-auto grid max-w-content items-center gap-12 lg:grid-cols-2">
            <div className="space-y-5">
              <SectionTitle id="multi-title">{MULTI_DOCTOR.title}</SectionTitle>
              <p className="text-lg text-body/85">
                {PRICING_PAGE.doctorsText.replace("{addon}", rupees(p.doctorAddon)).replace("{renewal}", rupees(p.renewalDoctor))}
              </p>
            </div>
            <div data-reveal-item>
              <MultiDoctorDiagram />
            </div>
          </div>
        </Reveal>

        <HowItWorksSection />

        <Reveal as="section" aria-labelledby="faq-title" className="bg-surface px-4 py-20 sm:px-6 lg:py-28">
          <div className="mx-auto max-w-3xl">
            <SectionTitle id="faq-title" className="mb-8 text-center">
              {FOR_CLINICS.faqTitle}
            </SectionTitle>
            <FaqList items={FAQ.items.filter((f) => CLINIC_FAQ.test(f.q))} />
          </div>
        </Reveal>

        <LeadPanel title={FOR_CLINICS.formTitle} source="clinics" />
        <FloatingWhatsApp href={wa} watchId="hero-cta" />
      </main>
    </MotionRoot>
  );
}

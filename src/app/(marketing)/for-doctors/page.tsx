import type { Metadata } from "next";
import { PhoneFrame } from "@/components/home/Frames";
import { MotionRoot } from "@/components/home/MotionRoot";
import { MultiDoctorDiagram } from "@/components/home/Sections";
import { FloatingWhatsApp } from "@/components/marketing/FloatingWhatsApp";
import { MiniProfile } from "@/components/marketing/Mockups";
import { HowItWorksSection, IncludedGrid, LeadPanel, PickDesignsSection, ProductHero } from "@/components/marketing/ProductPage";
import { Reveal } from "@/components/marketing/Reveal";
import { FaqList, SectionTitle } from "@/components/marketing/Sections";
import { FAQ, FOR_DOCTORS } from "@/content/marketing";
import { SAMPLE_PUBLIC_DOCTORS } from "@/fixtures/sample-public";
import { getPublicSiteData, rupees, whatsappHref } from "@/lib/public/site-data";
import { absUrl, PRODUCTION_HOSTNAME } from "@/lib/site";

export const revalidate = 600;

export const metadata: Metadata = {
  title: { absolute: "Portfolio websites for doctors – MediReach" },
  description:
    "A one-page website for individual doctors: qualifications, registration, clinics, timings and directions, with a digital visiting card. Built for the NMC advertising guidelines.",
  alternates: { canonical: absUrl("/for-doctors") },
};

const DOCTOR_FAQ = /NMC|every year|own domain|change timings|visiting card|owns my content/i;

export default async function ForDoctorsPage() {
  const site = await getPublicSiteData();
  const p = site.prices;
  const wa = whatsappHref(site.whatsappNumber, FOR_DOCTORS.whatsapp);
  // The sample doctor's own subdomain on the live domain; middleware serves it from /sample/gp.
  const doctor = { ...SAMPLE_PUBLIC_DOCTORS.gp, shareUrl: `https://draditisample.${PRODUCTION_HOSTNAME}` };

  return (
    <MotionRoot>
      <main>
        <ProductHero
          eyebrow={FOR_DOCTORS.eyebrow}
          title={FOR_DOCTORS.title}
          text={FOR_DOCTORS.text}
          price={FOR_DOCTORS.price.replace("{setup}", rupees(p.doctorSetup)).replace("{renewal}", rupees(p.renewalDoctor))}
          waHref={wa}
          waPlacement="for_doctors_hero"
          primaryCta={FOR_DOCTORS.primaryCta}
          secondary={{ href: "#designs", label: FOR_DOCTORS.secondaryCta }}
          visual={
            <div className="relative mx-auto flex w-full max-w-[480px] justify-center">
              <div aria-hidden className="absolute inset-x-0 inset-y-8 -z-10 rounded-[48px] bg-[radial-gradient(circle_at_50%_45%,var(--sage),var(--mint)_60%,transparent_75%)]" />
              <PhoneFrame scale={0.72}>
                <MiniProfile doctor={doctor} />
              </PhoneFrame>
            </div>
          }
        />

        <IncludedGrid title={FOR_DOCTORS.includedTitle} items={FOR_DOCTORS.included} />

        <PickDesignsSection kind="doctor" waNumber={site.whatsappNumber} />

        <Reveal as="section" aria-labelledby="linked-title" className="bg-sage px-4 py-20 sm:px-6 lg:py-28">
          <div className="mx-auto grid max-w-content items-center gap-12 lg:grid-cols-2">
            <div className="space-y-5">
              <SectionTitle id="linked-title">{FOR_DOCTORS.linkedTitle}</SectionTitle>
              <p className="text-lg text-body/85">{FOR_DOCTORS.linkedText.replace("{addon}", rupees(p.doctorAddon))}</p>
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
              {FOR_DOCTORS.faqTitle}
            </SectionTitle>
            <FaqList items={FAQ.items.filter((f) => DOCTOR_FAQ.test(f.q))} />
          </div>
        </Reveal>

        <LeadPanel title={FOR_DOCTORS.formTitle} source="doctors" />
        <FloatingWhatsApp href={wa} watchId="hero-cta" />
      </main>
    </MotionRoot>
  );
}

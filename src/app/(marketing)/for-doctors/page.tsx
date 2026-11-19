import type { Metadata } from "next";
import { Check } from "lucide-react";
import { DigitalCard } from "@/components/cards/DigitalCard";
import { CardSpotlight } from "@/components/home/CardSpotlight";
import { PhoneFrame } from "@/components/home/Frames";
import { MotionRoot } from "@/components/home/MotionRoot";
import { CardBack, CardFront, MultiDoctorDiagram } from "@/components/home/Sections";
import { FloatingWhatsApp } from "@/components/marketing/FloatingWhatsApp";
import { MiniProfile } from "@/components/marketing/Mockups";
import { HowItWorksSection, IncludedGrid, LeadPanel, ProductHero } from "@/components/marketing/ProductPage";
import { Reveal } from "@/components/marketing/Reveal";
import { FaqList, SectionTitle } from "@/components/marketing/Sections";
import { CARD_SPOTLIGHT, FAQ, FOR_DOCTORS } from "@/content/marketing";
import { SAMPLE_PUBLIC_DOCTORS } from "@/fixtures/sample-public";
import { getPublicSiteData, rupees, whatsappHref } from "@/lib/public/site-data";
import { absUrl, PRODUCTION_HOSTNAME } from "@/lib/site";
import { CARD_SIZE } from "@/templates/types";

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
          secondary={{ href: "#visiting-card", label: FOR_DOCTORS.secondaryCta }}
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

        <Reveal as="section" aria-labelledby="card-title" className="bg-paper px-4 py-20 sm:px-6 lg:py-28">
          <div id="visiting-card" className="mx-auto grid max-w-content scroll-mt-20 items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
            <div data-reveal-item className="relative order-2 mx-auto w-full max-w-[340px] lg:order-1">
              <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-marigold px-3 py-1 text-xs font-semibold text-white shadow-soft">
                {CARD_SPOTLIGHT.digitalLabel}
              </span>
              <div inert aria-hidden className="select-none">
                <DigitalCard doctor={doctor} websiteUrl={doctor.shareUrl} nameAs="p" priority={false} compact className="max-w-none" />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <SectionTitle id="card-title">{FOR_DOCTORS.cardTitle}</SectionTitle>
              <p className="mt-3 text-lg text-body/85">{FOR_DOCTORS.cardText}</p>
              <ul className="mt-7 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {CARD_SPOTLIGHT.points.map((pt) => (
                  <li key={pt} data-reveal-item className="flex gap-3 text-body">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-ink">
                      <Check className="size-3.5 text-marigold" strokeWidth={3} />
                    </span>
                    {pt}
                  </li>
                ))}
              </ul>
              <div data-reveal-item className="mt-8 max-w-[440px]">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-lagoon">{CARD_SPOTLIGHT.printLabel}</p>
                <CardSpotlight
                  ratio={CARD_SIZE.print.width / CARD_SIZE.print.height}
                  front={<CardFront doctor={doctor} fallbackScale={0.44} />}
                  back={<CardBack doctor={doctor} />}
                />
                <p className="mt-3 text-center text-xs text-muted-foreground">{CARD_SPOTLIGHT.flipHint}</p>
              </div>
            </div>
          </div>
        </Reveal>

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

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, Check, Hospital, ShieldCheck, UserRound } from "lucide-react";
import { FloatingWhatsApp } from "@/components/marketing/FloatingWhatsApp";
import { LeadForm } from "@/components/marketing/LeadForm";
import { MiniProfile } from "@/components/marketing/Mockups";
import { Reveal } from "@/components/marketing/Reveal";
import { Eyebrow, FaqList, PricingCards, SectionTitle } from "@/components/marketing/Sections";
import { WhatsAppIcon, WhatsAppLink } from "@/components/marketing/WhatsAppLink";
import { CardSpotlight } from "@/components/home/CardSpotlight";
import { DesignShowcase } from "@/components/home/DesignShowcase";
import { DrawLine, DrawUnderline } from "@/components/home/Draw";
import { HeroAudience } from "@/components/home/HeroAudience";
import { MiniSitePhone, toMiniSite } from "@/components/home/MiniSite";
import { MotionRoot } from "@/components/home/MotionRoot";
import { SearchDemo } from "@/components/home/SearchDemo";
import { CardBack, CardFront, ChatShare, GalleryItem, HeroStage, MultiDoctorDiagram, SpecialtyMarquee } from "@/components/home/Sections";
import {
  CARD_SPOTLIGHT,
  FAQ,
  FINAL_CTA,
  FOUND,
  GALLERY,
  HERO,
  HOME_DESIGNS,
  HOW_IT_WORKS,
  MULTI_DOCTOR,
  NMC,
  PRICING,
  PRODUCTS_COPY,
  WHATSAPP_TEXT,
  type Audience,
} from "@/content/marketing";
import { SAMPLE_SITES } from "@/fixtures/sample-sites";
import { SAMPLE_PUBLIC_DOCTORS } from "@/fixtures/sample-public";
import { displayPhone, getPublicSiteData, rupees, whatsappHref } from "@/lib/public/site-data";
import { absUrl, ROOT_HOSTNAME } from "@/lib/site";
import { CARD_SIZE } from "@/templates/types";
import { SPECIALTY_THEMES } from "@/themes/specialty";

/**
 * Homepage (DESIGN_BRIEF.md §4.1–4.15), sections in the brief's order.
 * Static (ISR), with prices and Founding spots from the database (cached;
 * refreshed when Settings or a Founding flag change).
 *
 * Motion (§3): the H1 renders immediately; client islands (audience switcher,
 * search demo, design picker, 3D card, line draw, count-up) hydrate on their
 * own, and `motion`'s animation features load after hydration.
 */

export const revalidate = 600;

export const metadata: Metadata = {
  title: { absolute: "MediReach – Websites for doctors, clinics and small hospitals in Pune" },
  description:
    "Portfolio websites for doctors, clinic websites designed for your specialty, and websites for hospitals up to 10 beds. Every plan includes a digital visiting card. Built for the NMC advertising guidelines.",
  alternates: { canonical: absUrl("/") },
  openGraph: {
    type: "website",
    url: absUrl("/"),
    title: "MediReach – Websites for doctors, clinics and small hospitals",
    description: "Patients search for you on Google. Make sure they find you.",
  },
};

const section = "px-4 py-20 sm:px-6 lg:py-32";
const PRODUCT_ICONS = { doctor: UserRound, clinic: Building2, hospital: Hospital } as const;

export default async function HomePage() {
  const site = await getPublicSiteData();
  const wa = whatsappHref(site.whatsappNumber, WHATSAPP_TEXT.default);
  const gp = SAMPLE_PUBLIC_DOCTORS.gp;
  const titleLead = HERO.title.replace(HERO.titleAccent, "").trim();
  const price = (setup: number, renewal: number) => HERO.price.replace("{setup}", rupees(setup)).replace("{renewal}", rupees(renewal));
  const p = site.prices;

  const heroPrices: Record<Audience, string> = {
    doctor: price(p.doctorSetup, p.renewalDoctor),
    clinic: price(p.clinicSetup, p.renewalClinic),
    hospital: price(p.hospitalSetup, p.renewalHospital),
  };
  const designSites = SPECIALTY_THEMES.map((t) => toMiniSite(SAMPLE_SITES[t.key]));
  const miniOf = (key: string) => designSites.find((s) => s.themeKey === key)!;
  const finalLead = FINAL_CTA.title.split(FINAL_CTA.titleAccent);

  return (
    <MotionRoot>
      <main>
        {/* 4.2 Hero — pulled up under the transparent sticky header. */}
        <section aria-labelledby="hero-title" className="mr-hero-bg relative -mt-16 overflow-hidden px-4 pb-20 pt-24 sm:px-6 lg:pb-28 lg:pt-32">
          {/* Targets for the top bar's Doctors / Clinics / Hospitals links. */}
          <span id="doctor" className="absolute top-0" />
          <span id="clinic" className="absolute top-0" />
          <span id="hospital" className="absolute top-0" />
          <HeroAudience
            heading={
              <>
                <span className="mr-enter inline-flex items-center gap-2 rounded-full bg-sage px-3.5 py-1.5 text-sm font-semibold text-ink">
                  <span aria-hidden className="size-2 shrink-0 rounded-full bg-marigold" />
                  {HERO.eyebrow}
                </span>
                <h1 id="hero-title" className="text-balance font-display text-[38px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink sm:text-5xl lg:text-[60px] xl:text-[64px]">
                  {titleLead} <em className="font-medium text-lagoon">{HERO.titleAccent}</em>
                </h1>
              </>
            }
            prices={heroPrices}
            card={<CardFront doctor={gp} />}
            waHref={wa}
            stages={{
              doctor: <HeroStage audience="doctor" doctor={gp} hostname={ROOT_HOSTNAME} />,
              clinic: <HeroStage audience="clinic" doctor={gp} site={miniOf("general-opd")} hostname={ROOT_HOSTNAME} />,
              hospital: <HeroStage audience="hospital" doctor={gp} site={miniOf("small-hospital")} hostname={ROOT_HOSTNAME} />,
            }}
          />
        </section>

        {/* 4.3 Specialty marquee */}
        <SpecialtyMarquee themes={SPECIALTY_THEMES} />

        {/* 4.4 Get found on Google */}
        <Reveal as="section" aria-labelledby="found-title" className={`${section} bg-surface`}>
          <div className="mx-auto grid max-w-content items-center gap-12 lg:grid-cols-2">
            <div>
              <SectionTitle id="found-title">
                <span data-reveal-item className="block">
                  {FOUND.title}
                </span>
              </SectionTitle>
              <ol className="mt-8 space-y-5">
                {FOUND.points.map((pt, i) => (
                  <li key={pt.title} data-reveal-item className="flex gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink font-display text-lg font-semibold text-marigold">{i + 1}</span>
                    <span>
                      <span className="block text-lg font-semibold text-ink">{pt.title}</span>
                      <span className="text-body/85">{pt.text}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <p data-reveal-item className="mt-8 text-sm text-muted-foreground">
                {FOUND.note}
              </p>
            </div>
            <div data-reveal-item className="flex justify-center lg:justify-end">
              <SearchDemo />
            </div>
          </div>
        </Reveal>

        {/* 4.5 Three products */}
        <Reveal as="section" aria-labelledby="products-title" className={`${section} bg-mint`}>
          <div id="products" className="mx-auto max-w-content scroll-mt-20">
            <div className="text-center">
              <Eyebrow>{PRODUCTS_COPY.eyebrow}</Eyebrow>
              <SectionTitle id="products-title">{PRODUCTS_COPY.title}</SectionTitle>
            </div>
            <div className="relative mt-12">
              <p className="relative z-10 mx-auto -mb-5 w-fit rounded-full bg-marigold px-5 py-2 text-center text-sm font-semibold text-[#0e3b3c] shadow-soft lg:-mb-5 lg:w-full lg:rounded-xl">
                {PRODUCTS_COPY.ribbon}
              </p>
              <ul className="grid gap-6 lg:grid-cols-3">
                {PRODUCTS_COPY.items.map((item) => {
                  const Icon = PRODUCT_ICONS[item.key];
                  return (
                    <li key={item.key} data-reveal-item className="mr-lift flex flex-col rounded-2xl border border-line bg-surface p-7 pt-10 shadow-soft">
                      <span className="flex size-12 items-center justify-center rounded-xl bg-sage text-ink">
                        <Icon className="size-6" strokeWidth={1.75} />
                      </span>
                      <h3 className="mt-5 font-display text-[24px] font-semibold text-ink">{item.name}</h3>
                      <p className="mt-1 text-body/85">{item.purpose}</p>
                      <ul className="mt-5 flex-1 space-y-2.5">
                        {item.inclusions.map((f) => (
                          <li key={f} className="flex gap-2.5 text-body">
                            <Check className="mt-1 size-4 shrink-0 text-leaf" strokeWidth={2.5} />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-6 border-t border-line pt-5">
                        <p className="flex items-baseline gap-2">
                          <span className="font-display text-[34px] font-semibold leading-none text-ink">{rupees(p[item.setup])}</span>
                          <span className="text-sm text-muted-foreground">{PRODUCTS_COPY.setupLabel}</span>
                        </p>
                        <p className="mt-1 text-sm text-body">{PRODUCTS_COPY.renewal.replace("{renewal}", rupees(p[item.renewal]))}</p>
                        <Link href={item.href} className="group mt-4 inline-flex items-center gap-1.5 font-semibold text-lagoon hover:text-ink">
                          {PRODUCTS_COPY.seeSample}
                          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                          <span className="sr-only">: {item.name}</span>
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </Reveal>

        {/* 4.6 Designs made for your specialty */}
        <Reveal as="section" aria-labelledby="designs-title" className={`${section} bg-paper`}>
          <div id="designs" className="mx-auto max-w-content scroll-mt-20">
            <div className="mb-10 text-center">
              <SectionTitle id="designs-title">{HOME_DESIGNS.title}</SectionTitle>
              <p className="mx-auto mt-3 max-w-xl text-lg text-body/85">{HOME_DESIGNS.text}</p>
            </div>
            <DesignShowcase sites={designSites} />
          </div>
        </Reveal>

        {/* 4.7 Digital visiting card spotlight */}
        <Reveal as="section" aria-labelledby="card-title" className={`${section} bg-surface`}>
          <div id="visiting-card" className="mx-auto grid max-w-content scroll-mt-20 items-center gap-14 lg:grid-cols-2">
            <div data-reveal-item className="relative mx-auto w-full max-w-[480px] pb-[190px]">
              <CardSpotlight
                ratio={CARD_SIZE.print.width / CARD_SIZE.print.height}
                front={<CardFront doctor={gp} fallbackScale={0.46} />}
                back={<CardBack doctor={gp} />}
              />
              <p className="mt-3 text-center text-xs text-muted-foreground">{CARD_SPOTLIGHT.flipHint}</p>
              <div className="absolute bottom-0 right-0 sm:-right-8">
                <ChatShare doctor={gp} url={gp.shareUrl.replace(/^https?:\/\//, "")} />
              </div>
            </div>
            <div>
              <Eyebrow>{CARD_SPOTLIGHT.eyebrow}</Eyebrow>
              <SectionTitle id="card-title">{CARD_SPOTLIGHT.title}</SectionTitle>
              <ul className="mt-8 space-y-4">
                {CARD_SPOTLIGHT.points.map((pt) => (
                  <li key={pt} data-reveal-item className="flex gap-3 text-lg text-body">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-ink">
                      <Check className="size-3.5 text-marigold" strokeWidth={3} />
                    </span>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>

        {/* 4.8 How it works */}
        <Reveal as="section" aria-labelledby="how-title" className={`${section} bg-mint`}>
          <div id="how-it-works" className="mx-auto max-w-content scroll-mt-20">
            <SectionTitle id="how-title" className="text-center">
              {HOW_IT_WORKS.title}
            </SectionTitle>
            <ol className="relative mt-14 grid gap-8 md:grid-cols-3 md:gap-6">
              <DrawLine vertical className="absolute bottom-8 left-[27px] top-8 w-[2px] md:hidden" />
              <DrawLine className="absolute left-[16.6%] right-[16.6%] top-7 hidden h-[2px] md:block" />
              {HOW_IT_WORKS.steps.map((s, i) => (
                <li key={s.title} data-reveal-item className="relative flex gap-5 md:flex-col md:items-center md:text-center">
                  <span className="relative z-10 flex size-14 shrink-0 items-center justify-center rounded-full bg-ink font-display text-2xl font-semibold text-marigold shadow-lift ring-8 ring-mint">
                    {i + 1}
                  </span>
                  <div className="pt-2 md:pt-0">
                    <h3 className="font-display text-[22px] font-semibold text-ink">{s.title}</h3>
                    <p className="mt-2 text-body/85">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>

        {/* 4.9 Built for the new NMC rules */}
        <section aria-labelledby="nmc-title" className={`${section} mr-ink-bg text-paper`}>
          <Reveal className="mx-auto max-w-content">
            <span data-reveal-item className="flex size-14 items-center justify-center rounded-2xl bg-marigold/15 ring-1 ring-marigold/40">
              <ShieldCheck className="size-8 text-marigold" strokeWidth={1.5} />
            </span>
            <SectionTitle id="nmc-title" light className="mt-5 max-w-3xl">
              {NMC.title}
            </SectionTitle>
            <ul className="mt-10 grid gap-5 md:grid-cols-3">
              {NMC.points.map((pt) => (
                <li key={pt.title} data-reveal-item className="rounded-2xl border border-paper/15 bg-paper/[.04] p-6">
                  <h3 className="flex items-start gap-2.5 text-lg font-semibold">
                    <span aria-hidden className="mt-2.5 size-2 shrink-0 rounded-full bg-marigold" />
                    {pt.title}
                  </h3>
                  <p className="mt-2 text-paper/75">{pt.text}</p>
                </li>
              ))}
            </ul>
            <p className="mt-10 text-sm text-paper/65">{NMC.note}</p>
          </Reveal>
        </section>

        {/* 4.10 Pricing */}
        <Reveal as="section" aria-labelledby="pricing-title" className={`${section} bg-surface`}>
          <div id="pricing" className="mx-auto max-w-content scroll-mt-20">
            <SectionTitle id="pricing-title" className="mb-10 text-center">
              {PRICING.title}
            </SectionTitle>
            <PricingCards site={site} />
          </div>
        </Reveal>

        {/* 4.11 For multi-doctor clinics and hospitals */}
        <Reveal as="section" aria-labelledby="multi-title" className={`${section} bg-sage`}>
          <div className="mx-auto grid max-w-content items-center gap-12 lg:grid-cols-2">
            <div className="space-y-5">
              <SectionTitle id="multi-title">{MULTI_DOCTOR.title}</SectionTitle>
              <p className="text-lg text-body/85">{MULTI_DOCTOR.text}</p>
              <WhatsAppLink
                href={whatsappHref(site.whatsappNumber, WHATSAPP_TEXT.hospital)}
                placement="multi_doctor"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-ink px-6 font-semibold text-paper transition-colors hover:bg-ink-700 active:scale-[.98]"
              >
                <WhatsAppIcon className="size-5" /> {MULTI_DOCTOR.cta}
              </WhatsAppLink>
            </div>
            <div data-reveal-item>
              <MultiDoctorDiagram />
            </div>
          </div>
        </Reveal>

        {/* 4.12 Sample sites gallery */}
        <Reveal as="section" aria-labelledby="gallery-title" className={`${section} bg-paper`}>
          <div className="mx-auto max-w-content">
            <div className="text-center">
              <SectionTitle id="gallery-title">{GALLERY.title}</SectionTitle>
              <p className="mt-3 text-body/80">{GALLERY.text}</p>
            </div>
            <ul className="-mx-4 mt-12 flex snap-x snap-mandatory gap-8 overflow-x-auto px-4 pb-6 pt-4 sm:-mx-6 sm:px-6">
              {GALLERY.doctors.map((d) => (
                <GalleryItem key={d.key} label={d.label} href={d.href} open={GALLERY.open} badge={GALLERY.badge}>
                  <MiniProfile doctor={SAMPLE_PUBLIC_DOCTORS[d.key]} />
                </GalleryItem>
              ))}
              {GALLERY.sites.map((key) => {
                const s = miniOf(key);
                return (
                  <GalleryItem key={key} label={s.themeName} href={s.href} open={GALLERY.open} badge={GALLERY.badge}>
                    <MiniSitePhone site={s} />
                  </GalleryItem>
                );
              })}
            </ul>
          </div>
        </Reveal>

        {/* 4.13 FAQ */}
        <Reveal as="section" aria-labelledby="faq-title" className={`${section} bg-mint`}>
          <div className="mx-auto max-w-3xl">
            <SectionTitle id="faq-title" className="mb-8 text-center">
              {FAQ.title}
            </SectionTitle>
            <FaqList />
          </div>
        </Reveal>

        {/* 4.14 Final CTA */}
        <Reveal as="section" aria-labelledby="final-title" className={section}>
          <div className="mr-ink-bg mx-auto grid max-w-content items-center gap-10 overflow-hidden rounded-3xl px-6 py-12 text-paper shadow-lift sm:px-12 lg:grid-cols-[1.1fr_1fr] lg:py-16">
            <div className="text-center lg:text-left">
              <h2 id="final-title" className="font-display text-[34px] font-semibold leading-[1.15] tracking-[-0.015em] lg:text-5xl">
                {finalLead[0]}
                <DrawUnderline>{FINAL_CTA.titleAccent}</DrawUnderline>
                {finalLead[1]}
              </h2>
              <div className="mt-8 flex flex-col items-center gap-4 lg:items-start">
                <WhatsAppLink
                  href={wa}
                  placement="final_cta"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-marigold px-6 font-semibold text-[#0e3b3c] transition-colors hover:bg-[#ebb456] active:scale-[.98]"
                >
                  <WhatsAppIcon className="size-5" /> {FINAL_CTA.whatsapp}
                </WhatsAppLink>
                {site.contactPhone && (
                  <a href={`tel:+${site.contactPhone}`} className="text-paper/80 underline-offset-4 hover:underline">
                    {FINAL_CTA.call.replace("{phone}", displayPhone(site.contactPhone))}
                  </a>
                )}
              </div>
            </div>
            <div className="rounded-2xl bg-surface p-6 text-left text-body shadow-lift">
              <p className="mb-4 font-semibold text-ink">{FINAL_CTA.formTitle}</p>
              <LeadForm source="homepage_form" compact />
            </div>
          </div>
        </Reveal>

        <FloatingWhatsApp href={wa} watchId="hero-cta" />
      </main>
    </MotionRoot>
  );
}

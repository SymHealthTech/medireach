import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, CreditCard, PhoneCall, SearchX, ShieldCheck } from "lucide-react";
import { CardView } from "@/components/cards/CardView";
import { FloatingWhatsApp } from "@/components/marketing/FloatingWhatsApp";
import { LeadForm } from "@/components/marketing/LeadForm";
import { BrowserMockup, PhoneMockup } from "@/components/marketing/Mockups";
import { Reveal } from "@/components/marketing/Reveal";
import { FaqList, PricingCards, SectionTitle } from "@/components/marketing/Sections";
import { WhatsAppIcon, WhatsAppLink } from "@/components/marketing/WhatsAppLink";
import { FAQ, FINAL_CTA, HERO, HOSPITALS, HOW_IT_WORKS, NMC, PRICING, PROBLEMS, SAMPLES, WHAT_YOU_GET, WHATSAPP_TEXT } from "@/content/marketing";
import { SAMPLE_PUBLIC_DOCTORS } from "@/fixtures/sample-public";
import { displayPhone, getPublicSiteData, rupees, whatsappHref } from "@/lib/public/site-data";
import { absUrl } from "@/lib/site";

/**
 * Homepage (DESIGN_BRIEF.md §3), sections in the brief's order. Static, with
 * prices and Founding spots coming from the database (cached; refreshed when
 * Settings or a Founding flag change).
 */

export const revalidate = 600;

export const metadata: Metadata = {
  title: { absolute: "MediReach – Websites and digital visiting cards for doctors in Pune" },
  description:
    "A professional one-page website and digital visiting card for doctors. Found on Google by your name, ready in 24 hours, built for the NMC advertising guidelines.",
  alternates: { canonical: absUrl("/") },
  openGraph: {
    type: "website",
    url: absUrl("/"),
    title: "MediReach – Websites and digital visiting cards for doctors",
    description: "Your patients search your name. Make sure they find you.",
  },
};

const PROBLEM_ICONS = { search: SearchX, phone: PhoneCall, card: CreditCard } as const;
const section = "px-4 py-[72px] sm:px-6 lg:py-[120px]";

// Fictional consultants for the hospitals band (clearly labelled "Sample").
const HOSPITAL_SAMPLES = [
  { name: "Dr. A. Sample", role: "Cardiologist", days: "Mon · Wed · Fri" },
  { name: "Dr. B. Sample", role: "Orthopaedic Surgeon", days: "Tue · Thu" },
  { name: "Dr. C. Sample", role: "Paediatrician", days: "Mon – Sat" },
  { name: "Dr. D. Sample", role: "Dermatologist", days: "Wed · Sat" },
];

export default async function HomePage() {
  const site = await getPublicSiteData();
  const wa = whatsappHref(site.whatsappNumber, WHATSAPP_TEXT.default);
  const gp = SAMPLE_PUBLIC_DOCTORS.gp;

  return (
    <main>
      {/* 2. Hero */}
      <section aria-labelledby="hero-title" className="relative overflow-hidden px-4 pb-[72px] pt-10 sm:px-6 lg:pb-[120px] lg:pt-16">
        <div className="mx-auto grid max-w-content items-center gap-14 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-6">
            <span className="inline-flex rounded-full bg-sage px-3 py-1 text-sm font-medium text-ink">{HERO.eyebrow}</span>
            <h1 id="hero-title" className="font-display text-[36px] font-semibold leading-[1.15] text-ink sm:text-5xl lg:text-[60px]">
              {HERO.title}
            </h1>
            <p className="max-w-xl text-lg text-body">{HERO.sub.replace("{price}", rupees(site.prices.gp))}</p>
            <div id="hero-cta" className="flex flex-col gap-3 sm:flex-row">
              <WhatsAppLink
                href={wa}
                placement="hero"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-ink px-6 font-semibold text-paper hover:bg-ink-700 active:scale-[.98]"
              >
                <WhatsAppIcon className="size-5" /> {HERO.primaryCta}
              </WhatsAppLink>
              <Link
                href="/sample/gp"
                className="inline-flex min-h-12 items-center justify-center rounded-[10px] border border-ink px-6 font-semibold text-ink hover:bg-sage active:scale-[.98]"
              >
                {HERO.secondaryCta}
              </Link>
            </div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <BadgeCheck className="size-4 text-leaf" strokeWidth={1.75} /> {HERO.trust}
            </p>
          </div>

          <div className="relative mx-auto flex w-full max-w-[460px] justify-center py-6">
            <svg aria-hidden viewBox="0 0 400 400" className="absolute inset-0 m-auto h-full w-full text-sage">
              <path
                fill="currentColor"
                d="M318 72c38 34 58 88 50 140-8 51-44 100-92 125-48 26-108 28-160 6S20 274 14 214C8 153 38 89 88 56c50-34 120-44 170-30 22 6 42 22 60 46Z"
              />
            </svg>
            <div className="float-gentle relative">
              <PhoneMockup doctor={gp} />
            </div>
            <div className="absolute -bottom-2 left-0 w-[230px] -rotate-6 sm:left-2 sm:w-[260px]">
              <CardView doctor={gp} variant="print" className="shadow-[0_8px_24px_rgba(14,59,60,.18)]" />
            </div>
          </div>
        </div>
      </section>

      {/* 3. The problem */}
      <Reveal as="section" className={section}>
        <div className="mx-auto max-w-content">
          <SectionTitle className="inline-block border-b-2 border-marigold pb-1">{PROBLEMS.title}</SectionTitle>
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {PROBLEMS.items.map((p) => {
              const Icon = PROBLEM_ICONS[p.icon];
              return (
                <li key={p.text} className="rounded-xl border border-line bg-surface p-6 shadow-soft">
                  <span className="flex size-11 items-center justify-center rounded-lg bg-sage">
                    <Icon className="size-5 text-ink" strokeWidth={1.75} />
                  </span>
                  <p className="mt-4 text-lg text-body">{p.text}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </Reveal>

      {/* 4. What you get */}
      <Reveal as="section" className={`${section} bg-surface`}>
        <div className="mx-auto grid max-w-content items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionTitle>{WHAT_YOU_GET.title}</SectionTitle>
            <ul className="mt-8 space-y-4">
              {WHAT_YOU_GET.items.map((item) => (
                <li key={item} className="flex gap-3 text-lg text-body">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-leaf/15">
                    <BadgeCheck className="size-4 text-leaf" strokeWidth={2} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-center">
            <BrowserMockup doctor={gp} url={WHAT_YOU_GET.urlExample} />
          </div>
        </div>
      </Reveal>

      {/* 5. How it works */}
      <Reveal as="section" className={section}>
        <div id="how-it-works" className="mx-auto max-w-content scroll-mt-20">
          <SectionTitle>{HOW_IT_WORKS.title}</SectionTitle>
          <ol className="relative mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            <span aria-hidden className="absolute bottom-6 left-6 top-6 border-l-2 border-dotted border-ink/30 md:inset-x-[16%] md:bottom-auto md:left-[16%] md:top-6 md:border-l-0 md:border-t-2" />
            {HOW_IT_WORKS.steps.map((s, i) => (
              <li key={s.title} className="relative flex gap-5 md:flex-col md:items-center md:text-center">
                <span className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full bg-ink font-display text-xl font-semibold text-paper ring-8 ring-paper">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-display text-xl font-semibold text-ink">{s.title}</h3>
                  <p className="mt-2 text-body">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Reveal>

      {/* 6. NMC */}
      <section aria-labelledby="nmc-title" className={`${section} bg-ink text-paper`}>
        <Reveal className="mx-auto max-w-content">
          <ShieldCheck className="size-10 text-marigold" strokeWidth={1.5} />
          <SectionTitle id="nmc-title" light className="mt-4">
            {NMC.title}
          </SectionTitle>
          <ul className="mt-10 grid gap-8 md:grid-cols-3">
            {NMC.points.map((p) => (
              <li key={p.title}>
                <h3 className="text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-paper/80">{p.text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-10 text-sm text-paper/60">{NMC.note}</p>
        </Reveal>
      </section>

      {/* 7. Pricing */}
      <Reveal as="section" className={section}>
        <div id="pricing" className="mx-auto max-w-4xl scroll-mt-20">
          <SectionTitle className="mb-8 text-center">{PRICING.title}</SectionTitle>
          <PricingCards site={site} />
        </div>
      </Reveal>

      {/* 8. For hospitals */}
      <Reveal as="section" className={`${section} bg-sage`}>
        <div className="mx-auto grid max-w-content items-center gap-10 lg:grid-cols-2">
          <div className="space-y-5">
            <SectionTitle>{HOSPITALS.title}</SectionTitle>
            <p className="text-lg text-body">{HOSPITALS.text}</p>
            <Link
              href="/hospitals"
              className="inline-flex min-h-12 items-center rounded-[10px] bg-ink px-6 font-semibold text-paper hover:bg-ink-700 active:scale-[.98]"
            >
              {HOSPITALS.cta}
            </Link>
          </div>
          <ul aria-label="Sample consultant pages" className="grid grid-cols-2 gap-3">
            {HOSPITAL_SAMPLES.map((d) => (
              <li key={d.name} className="rounded-xl bg-surface p-4 shadow-soft">
                <span className="flex size-10 items-center justify-center rounded-full bg-sage font-display text-sm font-semibold text-ink">
                  {d.name.split(" ")[1]![0]}S
                </span>
                <p className="mt-3 font-display font-semibold text-ink">{d.name}</p>
                <p className="text-sm text-body">{d.role}</p>
                <p className="mt-1 text-xs text-muted-foreground">{d.days}</p>
                <span className="mt-2 inline-block rounded-full bg-marigold/25 px-2 py-0.5 text-[11px] font-semibold text-ink">{SAMPLES.badge}</span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>

      {/* 9. Sample pages */}
      <Reveal as="section" className={section}>
        <div className="mx-auto max-w-content text-center">
          <SectionTitle>{SAMPLES.title}</SectionTitle>
          <p className="mt-3 text-body">{SAMPLES.text}</p>
          <div className="mt-12 flex flex-wrap justify-center gap-12">
            {SAMPLES.items.map((s) => (
              <div key={s.key} className="flex flex-col items-center gap-4">
                <PhoneMockup doctor={SAMPLE_PUBLIC_DOCTORS[s.key]} badge={SAMPLES.badge} />
                <p className="font-medium text-body">{s.label}</p>
                <Link href={s.href} className="font-semibold text-ink underline underline-offset-4">
                  {SAMPLES.open}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* 10. FAQ */}
      <Reveal as="section" className={`${section} bg-surface`}>
        <div className="mx-auto max-w-3xl">
          <SectionTitle className="mb-8 text-center">{FAQ.title}</SectionTitle>
          <FaqList />
        </div>
      </Reveal>

      {/* 11. Final CTA */}
      <Reveal as="section" className={section}>
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-display text-[34px] font-semibold leading-tight text-ink lg:text-5xl">{FINAL_CTA.title}</p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <WhatsAppLink
              href={wa}
              placement="final_cta"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-ink px-6 font-semibold text-paper hover:bg-ink-700 active:scale-[.98]"
            >
              <WhatsAppIcon className="size-5" /> {FINAL_CTA.whatsapp}
            </WhatsAppLink>
            {site.contactPhone && (
              <a href={`tel:+${site.contactPhone}`} className="text-body underline-offset-4 hover:underline">
                {FINAL_CTA.call.replace("{phone}", displayPhone(site.contactPhone))}
              </a>
            )}
          </div>
          <div className="mx-auto mt-12 max-w-md rounded-xl border border-line bg-surface p-6 text-left shadow-soft">
            <p className="mb-4 font-semibold text-ink">{FINAL_CTA.formTitle}</p>
            <LeadForm source="homepage_form" compact />
          </div>
        </div>
      </Reveal>

      <FloatingWhatsApp href={wa} watchId="hero-cta" />
    </main>
  );
}

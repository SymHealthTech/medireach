import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, CreditCard, PhoneCall, SearchX, ShieldCheck } from "lucide-react";
import { CardView } from "@/components/cards/CardView";
import { CallbackButton } from "@/components/marketing/CallbackButton";
import { FloatingWhatsApp } from "@/components/marketing/FloatingWhatsApp";
import { LeadForm } from "@/components/marketing/LeadForm";
import { BrowserMockup, PhoneMockup } from "@/components/marketing/Mockups";
import { Reveal } from "@/components/marketing/Reveal";
import { Eyebrow, FaqList, PricingCards, SectionTitle } from "@/components/marketing/Sections";
import { WhatsAppIcon, WhatsAppLink } from "@/components/marketing/WhatsAppLink";
import { FAQ, FINAL_CTA, HERO, HOSPITALS, HOW_IT_WORKS, NMC, PRICING, PROBLEMS, SAMPLES, WHAT_YOU_GET, WHATSAPP_TEXT } from "@/content/marketing";
import { SAMPLE_PORTRAITS } from "@/fixtures/sample-portraits";
import { SAMPLE_PUBLIC_DOCTORS } from "@/fixtures/sample-public";
import { displayPhone, getPublicSiteData, rupees, whatsappHref } from "@/lib/public/site-data";
import { absUrl } from "@/lib/site";

/**
 * Homepage (DESIGN_BRIEF.md §3), sections in the brief's order. Static, with
 * prices and Founding spots coming from the database (cached; refreshed when
 * Settings or a Founding flag change).
 *
 * Section backgrounds alternate light washes (paper hero → mist → white →
 * mint → ink → white → sage → paper → mint → ink panel) so no two
 * neighbours share a colour.
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
// One accent per problem card: icon tile tint + top rule.
const PROBLEM_TONES = [
  { tile: "bg-leaf/15 text-leaf-text", rule: "bg-leaf" },
  { tile: "bg-marigold/20 text-[#8a5a12]", rule: "bg-marigold" },
  { tile: "bg-lagoon/10 text-lagoon", rule: "bg-lagoon" },
];
const section = "px-4 py-[72px] sm:px-6 lg:py-[112px]";
const primaryBtn =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-ink px-6 font-semibold text-paper shadow-[0_8px_20px_-8px_rgba(14,59,60,.6)] transition-colors hover:bg-ink-700 active:scale-[.98]";
const arrow = "size-4 transition-transform group-hover:translate-x-0.5";

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
  const titleLead = HERO.title.replace(HERO.titleAccent, "").trim();

  return (
    <main>
      {/* 2. Hero — pulled up under the transparent sticky header so the wash runs to the top. */}
      <section aria-labelledby="hero-title" className="mr-hero-bg relative -mt-16 overflow-hidden px-4 pb-[72px] pt-26 sm:px-6 lg:pb-[112px] lg:pt-32">
        <div className="mx-auto grid max-w-content items-center gap-14 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-marigold/50 bg-surface/80 px-3.5 py-1.5 text-sm font-semibold text-ink shadow-soft">
              <span aria-hidden className="size-2 rounded-full bg-marigold" />
              {HERO.eyebrow}
            </span>
            <h1 id="hero-title" className="text-balance font-display text-[38px] font-semibold leading-[1.08] tracking-[-0.02em] text-ink sm:text-5xl lg:text-[56px] xl:text-[60px]">
              {titleLead} <em className="font-medium text-lagoon">{HERO.titleAccent}</em>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-body/85 lg:text-xl">{HERO.sub.replace("{price}", rupees(site.prices.gp))}</p>
            <div id="hero-cta" className="flex flex-col gap-3 sm:flex-row">
              <CallbackButton label={HERO.primaryCta} className={primaryBtn} />
              <Link
                href="/sample/gp"
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] border border-ink/20 bg-surface px-6 font-semibold text-ink transition-colors hover:border-ink active:scale-[.98]"
              >
                {HERO.secondaryCta}
                <ArrowRight className={arrow} strokeWidth={2} />
              </Link>
            </div>
            <p className="flex items-center gap-2 text-sm font-medium text-leaf-text">
              <ShieldCheck className="size-4" strokeWidth={2} /> {HERO.trust}
            </p>
          </div>

          <div className="relative mx-auto flex w-full max-w-[460px] justify-center py-6">
            <svg aria-hidden viewBox="0 0 400 400" className="absolute inset-0 m-auto h-full w-full">
              <defs>
                <linearGradient id="hero-blob" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#d7e8de" />
                  <stop offset="100%" stopColor="#a9cfc0" />
                </linearGradient>
              </defs>
              <path
                fill="url(#hero-blob)"
                d="M318 72c38 34 58 88 50 140-8 51-44 100-92 125-48 26-108 28-160 6S20 274 14 214C8 153 38 89 88 56c50-34 120-44 170-30 22 6 42 22 60 46Z"
              />
              <circle cx="342" cy="66" r="24" fill="#E3A23B" opacity=".9" />
              <circle cx="36" cy="322" r="9" fill="#0E3B3C" opacity=".85" />
            </svg>
            <div className="float-gentle relative">
              <PhoneMockup doctor={gp} />
            </div>
            <div className="absolute -bottom-2 left-0 w-[230px] -rotate-6 sm:left-2 sm:w-[260px]">
              <CardView doctor={gp} variant="print" className="shadow-[0_18px_40px_-10px_rgba(14,59,60,.35)]" />
            </div>
          </div>
        </div>
      </section>

      {/* 3. The problem */}
      <Reveal as="section" className={`${section} bg-mist`}>
        <div className="mx-auto max-w-content">
          <Eyebrow>{PROBLEMS.eyebrow}</Eyebrow>
          <SectionTitle>{PROBLEMS.title}</SectionTitle>
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {PROBLEMS.items.map((p, i) => {
              const Icon = PROBLEM_ICONS[p.icon];
              const tone = PROBLEM_TONES[i % PROBLEM_TONES.length]!;
              return (
                <li
                  key={p.text}
                  className="relative overflow-hidden rounded-2xl bg-surface p-7 shadow-soft transition-[translate,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-lift"
                >
                  <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${tone.rule}`} />
                  <div className="flex items-start justify-between">
                    <span className={`flex size-12 items-center justify-center rounded-xl ${tone.tile}`}>
                      <Icon className="size-6" strokeWidth={1.75} />
                    </span>
                    <span aria-hidden className="font-display text-4xl font-semibold text-ink/10">
                      0{i + 1}
                    </span>
                  </div>
                  <p className="mt-5 text-lg font-medium leading-snug text-ink">{p.text}</p>
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
            <ul className="mt-8 grid gap-4">
              {WHAT_YOU_GET.items.map((item) => (
                <li key={item} className="flex gap-3 text-lg text-body">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-ink">
                    <Check className="size-3.5 text-marigold" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative flex justify-center">
            <div aria-hidden className="mr-dots absolute -inset-6 rounded-3xl bg-mint [mask-image:radial-gradient(closest-side,black_60%,transparent)]" />
            <div className="relative">
              <BrowserMockup doctor={gp} url={WHAT_YOU_GET.urlExample} />
            </div>
          </div>
        </div>
      </Reveal>

      {/* 5. How it works */}
      <Reveal as="section" className={`${section} bg-mint`}>
        <div id="how-it-works" className="mx-auto max-w-content scroll-mt-20">
          <SectionTitle className="text-center">{HOW_IT_WORKS.title}</SectionTitle>
          <ol className="relative mt-12 grid gap-6 md:grid-cols-3">
            <span
              aria-hidden
              className="absolute bottom-10 left-[51px] top-10 border-l-2 border-dashed border-lagoon/30 md:inset-x-[16%] md:bottom-auto md:left-[16%] md:top-7 md:border-l-0 md:border-t-2"
            />
            {HOW_IT_WORKS.steps.map((s, i) => (
              <li key={s.title} className="relative flex gap-5 rounded-2xl bg-surface/70 p-6 md:flex-col md:items-center md:bg-transparent md:p-0 md:text-center">
                <span className="relative z-10 flex size-14 shrink-0 items-center justify-center rounded-full bg-ink font-display text-2xl font-semibold text-marigold shadow-lift ring-8 ring-mint">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-display text-[22px] font-semibold text-ink">{s.title}</h3>
                  <p className="mt-2 text-body/85">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Reveal>

      {/* 6. NMC */}
      <section aria-labelledby="nmc-title" className={`${section} mr-ink-bg text-paper`}>
        <Reveal className="mx-auto max-w-content">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-marigold/15 ring-1 ring-marigold/40">
            <ShieldCheck className="size-8 text-marigold" strokeWidth={1.5} />
          </span>
          <SectionTitle id="nmc-title" light className="mt-5">
            {NMC.title}
          </SectionTitle>
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {NMC.points.map((p) => (
              <li key={p.title} className="rounded-2xl border border-paper/15 bg-paper/[.04] p-6">
                <h3 className="flex items-center gap-2.5 text-lg font-semibold">
                  <span aria-hidden className="size-2 shrink-0 rounded-full bg-marigold" />
                  {p.title}
                </h3>
                <p className="mt-2 text-paper/75">{p.text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-10 text-sm text-paper/60">{NMC.note}</p>
        </Reveal>
      </section>

      {/* 7. Pricing */}
      <Reveal as="section" className={`${section} bg-surface`}>
        <div id="pricing" className="mx-auto max-w-4xl scroll-mt-20">
          <SectionTitle className="mb-10 text-center">{PRICING.title}</SectionTitle>
          <PricingCards site={site} />
        </div>
      </Reveal>

      {/* 8. For hospitals */}
      <Reveal as="section" className={`${section} bg-sage`}>
        <div className="mx-auto grid max-w-content items-center gap-10 lg:grid-cols-2">
          <div className="space-y-5">
            <SectionTitle>{HOSPITALS.title}</SectionTitle>
            <p className="text-lg text-body/85">{HOSPITALS.text}</p>
            <Link href="/hospitals" className={`group ${primaryBtn}`}>
              {HOSPITALS.cta}
              <ArrowRight className={arrow} strokeWidth={2} />
            </Link>
          </div>
          <ul aria-label="Sample consultant pages" className="grid grid-cols-2 gap-4 sm:pb-6">
            {HOSPITAL_SAMPLES.map((d, i) => (
              <li key={d.name} className={`rounded-2xl bg-surface p-5 shadow-soft ${i % 2 ? "sm:translate-y-6" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG illustration */}
                  <img src={SAMPLE_PORTRAITS.hospital[i % SAMPLE_PORTRAITS.hospital.length]} alt="" className="size-12 rounded-full object-cover ring-2 ring-surface shadow-soft" />
                  <span className="rounded-full bg-marigold/25 px-2 py-0.5 text-[11px] font-semibold text-ink">{SAMPLES.badge}</span>
                </div>
                <p className="mt-4 font-display text-lg font-semibold text-ink">{d.name}</p>
                <p className="text-sm text-body">{d.role}</p>
                <p className="mt-3 border-t border-line pt-3 text-xs font-semibold text-lagoon">{d.days}</p>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>

      {/* 9. Sample pages */}
      <Reveal as="section" className={section}>
        <div className="mx-auto max-w-content text-center">
          <SectionTitle>{SAMPLES.title}</SectionTitle>
          <p className="mt-3 text-body/80">{SAMPLES.text}</p>
          <div className="mt-12 flex flex-wrap justify-center gap-12">
            {SAMPLES.items.map((s) => (
              <div key={s.key} className="flex flex-col items-center gap-4">
                <PhoneMockup doctor={SAMPLE_PUBLIC_DOCTORS[s.key]} badge={SAMPLES.badge} />
                <p className="font-medium text-body">{s.label}</p>
                <Link href={s.href} className="group inline-flex items-center gap-1.5 font-semibold text-lagoon hover:text-ink">
                  {SAMPLES.open}
                  <ArrowRight className={arrow} strokeWidth={2} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* 10. FAQ */}
      <Reveal as="section" className={`${section} bg-mint`}>
        <div className="mx-auto max-w-3xl">
          <SectionTitle className="mb-8 text-center">{FAQ.title}</SectionTitle>
          <FaqList />
        </div>
      </Reveal>

      {/* 11. Final CTA */}
      <Reveal as="section" className={section}>
        <div className="mr-ink-bg mx-auto grid max-w-content items-center gap-10 overflow-hidden rounded-3xl px-6 py-12 text-paper shadow-lift sm:px-12 lg:grid-cols-[1.1fr_1fr] lg:py-16">
          <div className="text-center lg:text-left">
            <p className="font-display text-[34px] font-semibold leading-[1.1] tracking-[-0.015em] lg:text-5xl">{FINAL_CTA.title}</p>
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
  );
}

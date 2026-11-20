import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Check } from "lucide-react";
import { sampleCardFaces } from "@/components/cards/SampleCardFace";
import { DrawLine } from "@/components/home/Draw";
import { HOW_IT_WORKS, PICK_DESIGNS } from "@/content/marketing";
import type { IntakeKind } from "@/lib/constants";
import { LeadForm } from "./LeadForm";
import { PickDesigns } from "./PickDesigns";
import { Reveal } from "./Reveal";
import { SectionTitle } from "./Sections";
import { WhatsAppIcon, WhatsAppLink } from "./WhatsAppLink";

/** Building blocks for the product pages (/for-doctors, /for-clinics, /for-hospitals). Server components. */

export function ProductHero({
  eyebrow,
  title,
  text,
  price,
  waHref,
  waPlacement,
  primaryCta,
  secondary,
  visual,
}: {
  eyebrow: string;
  title: string;
  text: string;
  price: string;
  waHref: string;
  waPlacement: string;
  primaryCta: string;
  secondary: { href: string; label: string };
  visual: ReactNode;
}) {
  return (
    <section aria-labelledby="product-title" className="mr-hero-bg relative -mt-16 overflow-hidden px-4 pb-20 pt-24 sm:px-6 lg:pb-28 lg:pt-32">
      <div className="mx-auto grid max-w-content items-center gap-12 lg:grid-cols-[1fr_1.05fr]">
        <div className="space-y-6">
          <span className="mr-enter inline-flex items-center gap-2 rounded-full bg-sage px-3.5 py-1.5 text-sm font-semibold text-ink">
            <span aria-hidden className="size-2 rounded-full bg-marigold" />
            {eyebrow}
          </span>
          <h1 id="product-title" className="text-balance font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink sm:text-5xl lg:text-[56px]">
            {title}
          </h1>
          <p className="mr-enter max-w-xl text-lg leading-relaxed text-body/90 lg:text-xl" style={{ "--d": "60ms" } as React.CSSProperties}>
            {text}
          </p>
          <p className="mr-enter font-semibold text-ink" style={{ "--d": "120ms" } as React.CSSProperties}>
            {price}
          </p>
          <div id="hero-cta" className="mr-enter flex flex-col gap-3 sm:flex-row sm:flex-wrap" style={{ "--d": "180ms" } as React.CSSProperties}>
            <WhatsAppLink
              href={waHref}
              placement={waPlacement}
              className="inline-flex min-h-12 whitespace-nowrap items-center justify-center gap-2 rounded-[10px] bg-marigold px-6 font-semibold text-white shadow-[0_10px_24px_-10px_rgba(218,138,67,.8)] transition-colors hover:bg-marigold-700 active:scale-[.98]"
            >
              <WhatsAppIcon className="size-5" /> {primaryCta}
            </WhatsAppLink>
            <Link
              href={secondary.href}
              className="group inline-flex min-h-12 whitespace-nowrap items-center justify-center gap-2 rounded-[10px] border border-ink/20 bg-surface px-6 font-semibold text-ink transition-colors hover:border-ink active:scale-[.98]"
            >
              {secondary.label}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
            </Link>
          </div>
        </div>
        <div className="mr-enter relative" style={{ "--d": "120ms" } as React.CSSProperties}>
          {visual}
        </div>
      </div>
    </section>
  );
}

/** "Pick your designs" (#designs, the hero's second button): website designs and visiting cards, the same on all three pages. */
export function PickDesignsSection({ kind, waNumber }: { kind: IntakeKind; waNumber: string }) {
  return (
    <Reveal as="section" aria-labelledby="designs-title" className="bg-paper px-4 py-20 sm:px-6 lg:py-28">
      <div id="designs" className="mx-auto max-w-content scroll-mt-20">
        <div className="mb-10 text-center">
          <SectionTitle id="designs-title">{PICK_DESIGNS.title[kind]}</SectionTitle>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-body/85">{PICK_DESIGNS.text[kind]}</p>
        </div>
        <PickDesigns kind={kind} cardFaces={sampleCardFaces(kind)} waNumber={waNumber} />
      </div>
    </Reveal>
  );
}

export function IncludedGrid({ title, items }: { title: string; items: { title: string; text: string }[] }) {
  return (
    <Reveal as="section" aria-labelledby="included-title" className="bg-surface px-4 py-20 sm:px-6 lg:py-28">
      <div className="mx-auto max-w-content">
        <SectionTitle id="included-title" className="text-center">
          {title}
        </SectionTitle>
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <li key={it.title} data-reveal-item className="mr-lift rounded-2xl border border-line bg-paper p-6 shadow-soft">
              <span className="flex size-9 items-center justify-center rounded-full bg-ink">
                <Check className="size-4 text-marigold" strokeWidth={3} />
              </span>
              <h3 className="mt-4 font-display text-xl font-semibold text-ink">{it.title}</h3>
              <p className="mt-1.5 text-body/85">{it.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}

export function HowItWorksSection() {
  return (
    <Reveal as="section" aria-labelledby="how-title" className="bg-mint px-4 py-20 sm:px-6 lg:py-28">
      <div className="mx-auto max-w-content">
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
  );
}

export function LeadPanel({ title, source }: { title: string; source: "pricing" | "doctors" | "clinics" | "hospitals" }) {
  return (
    <section className="px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-soft sm:p-8">
        <LeadForm source={source} submitLabel="Request a call back" title={<SectionTitle className="mb-6 !text-2xl">{title}</SectionTitle>} />
      </div>
    </section>
  );
}

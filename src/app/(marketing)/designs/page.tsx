import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { PageIntro } from "@/components/marketing/PageIntro";
import { ThemeMiniPreview } from "@/components/public/ThemeMiniPreview";
import { DESIGNS } from "@/content/marketing";
import { SAMPLE_SITES } from "@/fixtures/sample-sites";
import { absUrl } from "@/lib/site";
import { THEME_ICONS } from "@/themes/icons";
import { SPECIALTY_THEMES } from "@/themes/specialty";

/**
 * Public specialty design gallery: one card per theme with its colours, a
 * mini preview and what it puts first, linking to a full sample site at
 * /designs/[themeKey] (noindex). Wording: "specialty designs", never "templates".
 */

export const metadata: Metadata = {
  title: { absolute: "Specialty designs for clinic and hospital websites – MediReach" },
  description:
    "Website designs for skin, dental, eye, ENT, cardiology, Ayurveda, homeopathy, physiotherapy, children's, women's and orthopaedic clinics and small hospitals, each personalised with your own details.",
  alternates: { canonical: absUrl("/designs") },
};

export default function DesignsPage() {
  return (
    <main>
      <PageIntro eyebrow={DESIGNS.eyebrow} title={DESIGNS.title}>
        <p>{DESIGNS.text}</p>
      </PageIntro>
      <section aria-label="Designs" className="mx-auto max-w-content px-4 pb-16 sm:px-6">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SPECIALTY_THEMES.map((t) => {
            const Icon = THEME_ICONS[t.icon];
            return (
              <li key={t.key} className="flex flex-col rounded-2xl border border-line bg-surface p-4 shadow-soft">
                <div className="relative">
                  <ThemeMiniPreview theme={t} name={SAMPLE_SITES[t.key].name} />
                  <span className="absolute right-2 top-2 rounded-full bg-marigold px-2 py-0.5 text-[11px] font-bold text-white">{DESIGNS.sampleBadge}</span>
                </div>
                <h2 className="mt-4 flex items-center gap-2 font-display text-xl font-semibold text-ink">
                  <Icon aria-hidden className="size-5" style={{ color: t.palette.primary }} strokeWidth={1.75} />
                  {t.name}
                </h2>
                <div className="mt-2 flex gap-1.5" aria-hidden>
                  {[t.palette.primary, t.palette.accent, t.palette.soft].map((c) => (
                    <span key={c} className="size-4 rounded-full border border-black/10" style={{ background: c }} />
                  ))}
                </div>
                <ul className="mt-3 flex-1 space-y-1.5 text-sm text-body">
                  {t.points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-leaf" strokeWidth={2.5} />
                      {p}
                    </li>
                  ))}
                </ul>
                <Link href={`/designs/${t.key}`} className="group mt-4 inline-flex items-center gap-1.5 font-semibold text-lagoon hover:text-ink">
                  {DESIGNS.view}
                  <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mx-auto mt-14 max-w-3xl rounded-2xl border border-line bg-surface p-6 shadow-soft">
          <h2 className="font-display text-xl font-semibold text-ink">{DESIGNS.faq.q}</h2>
          <p className="mt-2 text-body">{DESIGNS.faq.a}</p>
        </div>
      </section>
    </main>
  );
}

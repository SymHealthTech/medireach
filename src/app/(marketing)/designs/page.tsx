import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/marketing/PageIntro";
import { PickDesigns } from "@/components/marketing/PickDesigns";
import { DESIGNS } from "@/content/marketing";
import { INTAKE_KINDS, type IntakeKind } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { DESIGN_GROUPS } from "@/lib/intake/form";
import { getPublicSiteData } from "@/lib/public/site-data";
import { absUrl } from "@/lib/site";

/**
 * Public design gallery: Doctors / Clinics / Hospitals tabs (?for=…), then,
 * as in the website form, the clinic or hospital type and its designs, each
 * with View (the full sample site, /designs/[themeKey] or /sample/gp) and
 * Select, and "Start my form with this design". ?design=<themeKey> opens on
 * that design's type (the homepage "See all designs" link).
 * Wording: "designs", never "templates".
 */

export const metadata: Metadata = {
  title: { absolute: "Website designs for doctors, clinics and hospitals – MediReach" },
  description:
    "Portfolio website designs for doctors, and designs for skin, dental, eye, ENT, cardiology, Ayurveda, homeopathy, physiotherapy, children's, women's and orthopaedic clinics and small hospitals, each personalised with your own details.",
  alternates: { canonical: absUrl("/designs") },
};

const isKind = (k: unknown): k is IntakeKind => typeof k === "string" && (INTAKE_KINDS as readonly string[]).includes(k);

export default async function DesignsPage({ searchParams }: { searchParams: Promise<{ for?: string; design?: string }> }) {
  const [sp, site] = await Promise.all([searchParams, getPublicSiteData()]);
  const kind: IntakeKind = isKind(sp.for) ? sp.for : "clinic";
  const type = kind === "doctor" ? undefined : DESIGN_GROUPS[kind].find((g) => g.designs.some((d) => d.ready && d.value === sp.design))?.value;

  return (
    <main>
      <PageIntro eyebrow={DESIGNS.eyebrow} title={DESIGNS.title}>
        <p>{DESIGNS.text}</p>
      </PageIntro>

      <nav aria-label={DESIGNS.tabsLabel} className="mx-auto max-w-content px-4 pb-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm text-muted-foreground">{DESIGNS.tabsLabel}</span>
          {INTAKE_KINDS.map((k) => (
            <Link
              key={k}
              href={`/designs?for=${k}`}
              scroll={false}
              aria-current={k === kind ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold ring-1 transition",
                k === kind ? "bg-ink text-paper ring-ink" : "bg-mist text-ink ring-ink/10 hover:bg-sage",
              )}
            >
              {DESIGNS.tabs[k]}
            </Link>
          ))}
        </div>
      </nav>

      <section aria-label={DESIGNS.tabs[kind]} className="mx-auto max-w-content px-4 pb-16 sm:px-6">
        <PickDesigns key={`${kind}:${type ?? ""}`} kind={kind} type={type} waNumber={site.whatsappNumber} />
        <div className="mx-auto mt-14 max-w-3xl rounded-2xl border border-line bg-surface p-6 shadow-soft">
          <h2 className="font-display text-xl font-semibold text-ink">{DESIGNS.faq.q}</h2>
          <p className="mt-2 text-body">{DESIGNS.faq.a}</p>
        </div>
      </section>
    </main>
  );
}

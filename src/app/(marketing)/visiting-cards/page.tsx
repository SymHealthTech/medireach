import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { DoctorDesignCard, SiteDesignCard } from "@/components/cards/SampleCardFace";
import { CardViewer } from "@/components/marketing/CardViewer";
import { PageIntro } from "@/components/marketing/PageIntro";
import { WhatsAppIcon, WhatsAppLink } from "@/components/marketing/WhatsAppLink";
import { VISITING_CARDS } from "@/content/marketing";
import { SAMPLE_SITES } from "@/fixtures/sample-sites";
import { getPublicSiteData, whatsappHref } from "@/lib/public/site-data";
import { SAMPLE_DESIGNS } from "@/lib/sample-designs";
import { absUrl } from "@/lib/site";
import { SPECIALTY_THEMES } from "@/themes/specialty";
import type { CardVariant, PublicEstablishment } from "@/templates/types";

/**
 * Visiting card gallery: the card that comes with each website design. There
 * is no separate card choice: a doctor's card is the card of their website
 * design, and a clinic's or hospital's card takes its design's colours. Cards
 * are the real templates with each design's demo doctor or sample site.
 */

export const revalidate = 600;

export const metadata: Metadata = {
  title: { absolute: "Digital visiting cards for doctors, clinics and hospitals – MediReach" },
  description:
    "Every MediReach website design comes with its own digital visiting card in the same colours: a card link, a WhatsApp image and PDFs with working Call, WhatsApp and Directions buttons.",
  alternates: { canonical: absUrl("/visiting-cards") },
};

type Group = "doctor" | "clinic" | "hospital";
const GROUPS: Group[] = ["doctor", "clinic", "hospital"];
const GROUP_ID: Record<Group, string> = { doctor: "doctors", clinic: "clinics", hospital: "hospitals" };

interface Item {
  id: string;
  name: string;
  subtitle: string;
  swatches: readonly string[];
  designHref: string;
  face: (variant: CardVariant, full?: boolean) => ReactNode;
}

/** Doctors: one card per ready website design, with its demo doctor. */
const doctorItems = (): Item[] =>
  SAMPLE_DESIGNS.filter((d) => d.ready).map((d) => ({
    id: `doctor-${d.key}`,
    name: d.name,
    subtitle: d.colours,
    swatches: d.swatches,
    designHref: `/sample/${d.sample}?design=${d.key}`,
    face: (variant, full) => <DoctorDesignCard designKey={d.key} sample={d.sample} variant={variant} full={full} />,
  }));

/** Clinics / hospitals: one card per specialty design, with its sample site. */
const siteItems = (kind: "clinic" | "hospital"): Item[] =>
  SPECIALTY_THEMES.filter((t) => t.kind === kind).flatMap((t) => {
    const site: PublicEstablishment | undefined = Object.values(SAMPLE_SITES).find((s) => s.themeKey === t.key && s.kind === kind);
    if (!site) return [];
    return [
      {
        id: `${kind}-${t.key}`,
        name: t.name,
        subtitle: `${t.name} website design colours`,
        swatches: [t.palette.primary, t.palette.accent, t.palette.soft],
        designHref: `/designs/${t.key}`,
        face: (variant: CardVariant, full?: boolean) => <SiteDesignCard site={site} variant={variant} full={full} />,
      },
    ];
  });

function CardItem({ item }: { item: Item }) {
  return (
    <li id={item.id} className="flex w-full scroll-mt-36 flex-col rounded-2xl border border-line bg-surface p-4 shadow-soft target:ring-2 target:ring-marigold md:w-[calc(50%-10px)] sm:p-5">
      <CardViewer
        name={item.name}
        subtitle={item.subtitle}
        swatches={item.swatches}
        designHref={item.designHref}
        preview={
          // Phone card beside the print card, at the same height (9:16 next to 85:55).
          <span className="grid select-none items-end gap-3 rounded-xl p-3 sm:gap-4 sm:p-4" style={{ gridTemplateColumns: "minmax(0,0.364fr) minmax(0,1fr)", background: item.swatches[2] }}>
            {item.face("phone")}
            {item.face("print")}
          </span>
        }
        phone={item.face("phone", true)}
        print={item.face("print", true)}
      />
    </li>
  );
}

export default async function VisitingCardsPage() {
  const site = await getPublicSiteData();
  const C = VISITING_CARDS;

  return (
    <main>
      <PageIntro eyebrow={C.eyebrow} title={C.title}>
        <p>{C.text}</p>
      </PageIntro>

      {/* How choosing works */}
      <section aria-label="How it works" className="mx-auto max-w-content px-4 pb-10 sm:px-6">
        <ol className="grid gap-4 md:grid-cols-3">
          {C.steps.map((s, i) => (
            <li key={s.title} className="flex gap-4 rounded-2xl border border-line bg-surface p-5 shadow-soft">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink font-display text-lg font-semibold text-marigold">{i + 1}</span>
              <span>
                <span className="block font-semibold text-ink">{s.title}</span>
                <span className="text-sm text-body/85">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Jump links */}
      <nav aria-label={C.jumpLabel} className="sticky top-16 z-30 border-y border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-content items-center gap-2 overflow-x-auto px-4 py-2.5 sm:px-6">
          <span className="mr-1 hidden shrink-0 text-sm text-muted-foreground sm:inline">{C.jumpLabel}</span>
          {GROUPS.map((g) => (
            <a
              key={g}
              href={`#${GROUP_ID[g]}`}
              className="inline-flex min-h-10 shrink-0 items-center rounded-full bg-mist px-4 text-sm font-semibold text-ink ring-1 ring-ink/10 transition hover:bg-sage"
            >
              {C.groups[g].tab}
            </a>
          ))}
        </div>
      </nav>

      {GROUPS.map((g, i) => (
        <section key={g} id={GROUP_ID[g]} aria-labelledby={`${g}-title`} className={`scroll-mt-28 px-4 py-14 sm:px-6 lg:py-20 ${i % 2 ? "bg-surface" : ""}`}>
          <div className="mx-auto max-w-content">
            <div className="mb-8 max-w-2xl">
              <h2 id={`${g}-title`} className="font-display text-[30px] font-semibold leading-tight text-ink lg:text-4xl">
                {C.groups[g].title}
              </h2>
              <p className="mt-2 text-lg text-body/85">{C.groups[g].text}</p>
            </div>
            <ul className="flex flex-wrap justify-center gap-5">
              {(g === "doctor" ? doctorItems() : siteItems(g)).map((item) => (
                <CardItem key={item.id} item={item} />
              ))}
            </ul>
            <p className="mt-6 text-center text-sm text-muted-foreground">{C.sampleNote}</p>
          </div>
        </section>
      ))}

      {/* What's included + FAQ + help */}
      <section aria-labelledby="included-title" className="bg-mint px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto grid max-w-content gap-10 lg:grid-cols-2">
          <div>
            <h2 id="included-title" className="font-display text-[28px] font-semibold text-ink lg:text-[34px]">
              {C.included.title}
            </h2>
            <ul className="mt-6 space-y-3">
              {C.included.points.map((pt) => (
                <li key={pt} className="flex gap-3 text-body">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-ink">
                    <Check aria-hidden className="size-3.5 text-marigold" strokeWidth={3} />
                  </span>
                  {pt}
                </li>
              ))}
            </ul>
            <WhatsAppLink
              href={whatsappHref(site.whatsappNumber, C.helpText)}
              placement="visiting_card_help"
              className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-[10px] bg-ink px-6 font-semibold text-paper transition-colors hover:bg-ink-700 active:scale-[.98]"
            >
              <WhatsAppIcon className="size-5" /> {C.help}
            </WhatsAppLink>
          </div>
          <dl className="space-y-4">
            {C.faq.map((f) => (
              <div key={f.q} className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
                <dt className="font-semibold text-ink">{f.q}</dt>
                <dd className="mt-1.5 text-body/85">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </main>
  );
}

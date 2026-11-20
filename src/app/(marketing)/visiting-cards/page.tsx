import type { Metadata } from "next";
import { Check } from "lucide-react";
import { FitBox } from "@/components/home/FitBox";
import { CardViewer } from "@/components/marketing/CardViewer";
import { PageIntro } from "@/components/marketing/PageIntro";
import { WhatsAppIcon, WhatsAppLink } from "@/components/marketing/WhatsAppLink";
import { VISITING_CARDS } from "@/content/marketing";
import { SAMPLE_PUBLIC_DOCTORS } from "@/fixtures/sample-public";
import { SAMPLE_SITES } from "@/fixtures/sample-sites";
import { cardProps, siteCardProps } from "@/lib/cards/render";
import { CARD_STYLE_GROUPS, CARD_STYLES_BY_GROUP, cardStyleWhatsappText, type CardStyle, type CardStyleGroup } from "@/lib/cards/styles";
import { getPublicSiteData, whatsappHref } from "@/lib/public/site-data";
import { absUrl, PRODUCTION_HOSTNAME } from "@/lib/site";
import ClassicCard from "@/templates/card/classic";
import ClassicSiteCard from "@/templates/card/classic/site";
import { CARD_SIZE, type CardVariant } from "@/templates/types";

/**
 * Visiting card gallery: five colour styles each for doctors, clinics and
 * hospitals, each with a code name (lib/cards/styles.ts). People pick one and
 * send us the code; the admin sets it on their page/site (`cardStyle`), which
 * links that look to their card. Cards are the real templates with sample data.
 */

export const revalidate = 600;

export const metadata: Metadata = {
  title: { absolute: "Digital visiting cards for doctors, clinics and hospitals – MediReach" },
  description:
    "Choose a digital visiting card style for your doctor profile, clinic or hospital website: five colour styles each, with a phone card, WhatsApp image and print-ready PDF.",
  alternates: { canonical: absUrl("/visiting-cards") },
};

const GROUP_ID: Record<CardStyleGroup, string> = { doctor: "doctors", clinic: "clinics", hospital: "hospitals" };

/** Sample owners: the sample doctor's subdomain (as on the homepage) and the sample clinic and hospital sites. */
const sampleDoctor = { ...SAMPLE_PUBLIC_DOCTORS.gp, shareUrl: `https://draditisample.${PRODUCTION_HOSTNAME}` };
const sampleSite = { clinic: SAMPLE_SITES["general-opd"], hospital: SAMPLE_SITES["small-hospital"] };

/** A card at any size: small in the gallery, `full` in the full-screen viewer. */
function CardFace({ style, variant, full }: { style: CardStyle; variant: CardVariant; full?: boolean }) {
  const { width, height } = CARD_SIZE[variant];
  const fallbackScale = full ? (variant === "print" ? 0.6 : 0.35) : variant === "print" ? 0.3 : 0.12;
  return (
    <FitBox width={width} height={height} fallbackScale={fallbackScale} className={full ? undefined : variant === "print" ? "rounded-lg shadow-soft" : "rounded-xl shadow-soft"}>
      {style.group === "doctor" ? (
        <ClassicCard {...cardProps({ ...sampleDoctor, cardStyle: style.code }, variant, "html")} />
      ) : (
        <ClassicSiteCard {...siteCardProps({ ...sampleSite[style.group], cardStyle: style.code }, variant, "html")} />
      )}
    </FitBox>
  );
}

function StyleItem({ style, waNumber }: { style: CardStyle; waNumber: string }) {
  return (
    <li
      id={style.code.toLowerCase()}
      className="flex w-full scroll-mt-36 flex-col rounded-2xl border border-line bg-surface p-4 shadow-soft target:ring-2 target:ring-marigold md:w-[calc(50%-10px)] sm:p-5"
    >
      <CardViewer
        name={style.name}
        code={style.code}
        colours={style.colours}
        swatches={style.swatches}
        chooseHref={whatsappHref(waNumber, cardStyleWhatsappText(style.code))}
        placement={`visiting_card_${style.code.toLowerCase()}`}
        preview={
          // Phone card beside the print card, at the same height (9:16 next to 85:55).
          <span
            className="grid select-none items-end gap-3 rounded-xl p-3 sm:gap-4 sm:p-4"
            style={{ gridTemplateColumns: "minmax(0,0.364fr) minmax(0,1fr)", background: style.swatches[2] }}
          >
            <CardFace style={style} variant="phone" />
            <CardFace style={style} variant="print" />
          </span>
        }
        phone={<CardFace style={style} variant="phone" full />}
        print={<CardFace style={style} variant="print" full />}
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
          {CARD_STYLE_GROUPS.map((g) => (
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

      {CARD_STYLE_GROUPS.map((g, i) => (
        <section key={g} id={GROUP_ID[g]} aria-labelledby={`${g}-title`} className={`scroll-mt-28 px-4 py-14 sm:px-6 lg:py-20 ${i % 2 ? "bg-surface" : ""}`}>
          <div className="mx-auto max-w-content">
            <div className="mb-8 max-w-2xl">
              <h2 id={`${g}-title`} className="font-display text-[30px] font-semibold leading-tight text-ink lg:text-4xl">
                {C.groups[g].title}
              </h2>
              <p className="mt-2 text-lg text-body/85">{C.groups[g].text}</p>
            </div>
            <ul className="flex flex-wrap justify-center gap-5">
              {CARD_STYLES_BY_GROUP[g].map((s) => (
                <StyleItem key={s.code} style={s} waNumber={site.whatsappNumber} />
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

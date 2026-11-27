import { FitBox } from "@/components/home/FitBox";
import { DEMO_PUBLIC_DOCTORS } from "@/fixtures/demo-doctors";
import { cardProps, resolveSiteCardTemplate, siteCardProps } from "@/lib/cards/render";
import { resolveCardTemplate } from "@/templates/registry";
import { CARD_SIZE, type CardVariant, type PublicDoctor, type PublicEstablishment } from "@/templates/types";

/**
 * Sample visiting cards for the /visiting-cards gallery (server components):
 * the card that comes with a website design, filled with that design's demo
 * doctor or sample clinic/hospital. Small in the gallery, `full` in the viewer.
 */

function Frame({ variant, full, children }: { variant: CardVariant; full?: boolean; children: React.ReactNode }) {
  const { width, height } = CARD_SIZE[variant];
  const fallbackScale = full ? (variant === "print" ? 0.6 : 0.35) : variant === "print" ? 0.3 : 0.12;
  return (
    <FitBox width={width} height={height} fallbackScale={fallbackScale} className={full ? undefined : variant === "print" ? "rounded-lg shadow-soft" : "rounded-xl shadow-soft"}>
      {children}
    </FitBox>
  );
}

/** The card of doctor design `designKey`, with that design's demo doctor (`sample`). */
export function DoctorDesignCard({ designKey, sample, variant, full }: { designKey: string; sample: string; variant: CardVariant; full?: boolean }) {
  const demo = DEMO_PUBLIC_DOCTORS[sample];
  if (!demo) return null;
  const doctor: PublicDoctor = { ...demo, portfolioTemplateId: designKey };
  const Card = resolveCardTemplate(designKey);
  return (
    <Frame variant={variant} full={full}>
      <Card {...cardProps(doctor, variant, "html")} />
    </Frame>
  );
}

/** A clinic's or hospital's card: the sample site, in its design's colours. */
export function SiteDesignCard({ site, variant, full }: { site: PublicEstablishment; variant: CardVariant; full?: boolean }) {
  const Card = resolveSiteCardTemplate(site.siteTemplateId);
  return (
    <Frame variant={variant} full={full}>
      <Card {...siteCardProps(site, variant, "html")} />
    </Frame>
  );
}

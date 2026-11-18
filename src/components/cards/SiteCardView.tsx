import { CardFrame } from "@/components/cards/CardFrame";
import { resolveSiteCardTemplate, siteCardProps } from "@/lib/cards/render";
import { CARD_SIZE, type CardVariant, type PublicEstablishment } from "@/templates/types";

/** Server-rendered clinic/hospital card (HTML) in a scaling frame: same template as the PNG/PDF. */
export function SiteCardView({ site, variant, className }: { site: PublicEstablishment; variant: CardVariant; className?: string }) {
  const Card = resolveSiteCardTemplate(site.cardTemplateId);
  const { width, height } = CARD_SIZE[variant];
  return (
    <CardFrame width={width} height={height} className={className} label={`${site.name} – ${variant === "print" ? "printable" : "phone"} visiting card`}>
      <Card {...siteCardProps(site, variant, "html")} />
    </CardFrame>
  );
}

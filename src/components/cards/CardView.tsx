import { CardFrame } from "@/components/cards/CardFrame";
import { cardProps } from "@/lib/cards/render";
import { resolveCardTemplate, type ReadyTemplates } from "@/templates/registry";
import { CARD_SIZE, type CardVariant, type PublicDoctor } from "@/templates/types";

/**
 * Server-rendered card (HTML) in a scaling frame: the card of the doctor's
 * website design, the same template as the PNG/PDF. `links`: the phone card's
 * buttons are real links (the live card page).
 */
export function CardView({
  doctor,
  variant,
  ready,
  className,
  links,
}: {
  doctor: PublicDoctor;
  variant: CardVariant;
  ready?: ReadyTemplates;
  className?: string;
  links?: boolean;
}) {
  const Card = resolveCardTemplate(doctor.portfolioTemplateId, ready);
  const { width, height } = CARD_SIZE[variant];
  return (
    <CardFrame
      width={width}
      height={height}
      className={className}
      label={`${doctor.fullName} – ${variant === "print" ? "printable" : "phone"} visiting card`}
      interactive={links}
      // The live card page: visible before hydration (about a phone's width).
      fallbackScale={links ? 0.33 : undefined}
    >
      <Card {...cardProps(doctor, variant, "html", { links })} />
    </CardFrame>
  );
}

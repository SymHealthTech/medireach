import { CardFrame } from "@/components/cards/CardFrame";
import { cardProps } from "@/lib/cards/render";
import { resolveCardTemplate, type ReadyTemplates } from "@/templates/registry";
import { CARD_SIZE, type CardVariant, type PublicDoctor } from "@/templates/types";

/** Server-rendered card (HTML) in a scaling frame — same template as the PNG/PDF. */
export function CardView({
  doctor,
  variant,
  ready,
  className,
}: {
  doctor: PublicDoctor;
  variant: CardVariant;
  ready?: ReadyTemplates;
  className?: string;
}) {
  const Card = resolveCardTemplate(doctor.cardTemplateId, ready);
  const { width, height } = CARD_SIZE[variant];
  return (
    <CardFrame
      width={width}
      height={height}
      className={className}
      label={`${doctor.fullName} – ${variant === "print" ? "printable" : "phone"} visiting card`}
    >
      <Card {...cardProps(doctor, variant, "html")} />
    </CardFrame>
  );
}

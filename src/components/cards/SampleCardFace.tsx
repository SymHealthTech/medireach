import { FitBox } from "@/components/home/FitBox";
import type { CardFace } from "@/components/intake/IntakeContext";
import { SAMPLE_PUBLIC_DOCTORS } from "@/fixtures/sample-public";
import { SAMPLE_SITES } from "@/fixtures/sample-sites";
import { cardProps, siteCardProps } from "@/lib/cards/render";
import { CARD_STYLES_BY_GROUP, type CardStyle, type CardStyleGroup } from "@/lib/cards/styles";
import { PRODUCTION_HOSTNAME } from "@/lib/site";
import ClassicCard from "@/templates/card/classic";
import ClassicSiteCard from "@/templates/card/classic/site";
import { CARD_SIZE, type CardVariant, type PublicDoctor } from "@/templates/types";

/** Sample owners: the sample doctor's subdomain (as on the homepage) and the sample clinic and hospital sites. */
const sampleDoctor = { ...SAMPLE_PUBLIC_DOCTORS.gp, shareUrl: `https://draditisample.${PRODUCTION_HOSTNAME}` };
const sampleSite = { clinic: SAMPLE_SITES["general-opd"], hospital: SAMPLE_SITES["small-hospital"] };

/** A sample visiting card in one style (server component): small in a gallery, `full` in a full-screen viewer. */
export function SampleCardFace({ style, variant, full, doctor }: { style: CardStyle; variant: CardVariant; full?: boolean; doctor?: PublicDoctor }) {
  const { width, height } = CARD_SIZE[variant];
  const fallbackScale = full ? (variant === "print" ? 0.6 : 0.35) : variant === "print" ? 0.3 : 0.12;
  return (
    <FitBox width={width} height={height} fallbackScale={fallbackScale} className={full ? undefined : variant === "print" ? "rounded-lg shadow-soft" : "rounded-xl shadow-soft"}>
      {style.group === "doctor" ? (
        <ClassicCard {...cardProps({ ...(doctor ?? sampleDoctor), cardStyle: style.code }, variant, "html")} />
      ) : (
        <ClassicSiteCard {...siteCardProps({ ...sampleSite[style.group], cardStyle: style.code }, variant, "html")} />
      )}
    </FitBox>
  );
}

/** Every card style of a group as sample cards, for the website form's card picker. */
export function sampleCardFaces(group: CardStyleGroup): Record<string, CardFace> {
  return Object.fromEntries(
    CARD_STYLES_BY_GROUP[group].map((s) => [
      s.code,
      { thumb: <SampleCardFace style={s} variant="print" />, phone: <SampleCardFace style={s} variant="phone" full />, print: <SampleCardFace style={s} variant="print" full /> },
    ]),
  );
}

/** Every doctor card style with this doctor's own details (the dashboard's card picker). */
export function doctorCardFaces(doctor: PublicDoctor): Record<string, CardFace> {
  return Object.fromEntries(
    CARD_STYLES_BY_GROUP.doctor.map((s) => [
      s.code,
      {
        thumb: <SampleCardFace style={s} variant="print" doctor={doctor} />,
        phone: <SampleCardFace style={s} variant="phone" full doctor={doctor} />,
        print: <SampleCardFace style={s} variant="print" full doctor={doctor} />,
      },
    ]),
  );
}

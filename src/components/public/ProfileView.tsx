import { DoctorCardGrid } from "@/components/public/DoctorCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { MapPin } from "lucide-react";
import { introSentence, primaryClinic, profileJsonLd } from "@/lib/seo/profile";
import { resolvePortfolioTemplate, type ReadyTemplates } from "@/templates/registry";
import type { DoctorCardData, PublicDoctor } from "@/templates/types";

/**
 * The shared SEO wrapper around a portfolio template: JSON-LD, H1, intro and
 * nearby doctors are rendered here, identically for every template. The
 * template owns the whole page around them (its own navbar, sections and
 * footer), so each design reads as the doctor's own one-page website. Used by
 * the public profile page, the sample pages and the admin previews.
 */
export function ProfileView({
  doctor: d,
  nearby,
  ready,
  jsonLd = true,
}: {
  doctor: PublicDoctor;
  nearby: DoctorCardData[];
  /** Ready design slots; omit to render the doctor's chosen slot regardless (previews). */
  ready?: ReadyTemplates;
  /** Structured data for the doctor (off for sample pages). */
  jsonLd?: boolean;
}) {
  const Template = resolvePortfolioTemplate(d.portfolioTemplateId, ready);
  const clinic = primaryClinic(d);
  const place = clinic ? `${clinic.area.name}, ${clinic.city.name}` : "";

  const heading = (
    <div>
      <h1 className="font-display text-[32px] font-semibold leading-[1.1] tracking-tight text-ink sm:text-4xl lg:text-[44px]">
        {d.fullName}
      </h1>
      {d.primarySpecialty && <p className="mt-2 text-base font-semibold text-lagoon sm:text-lg">{d.primarySpecialty.name}</p>}
      {place && (
        <p className="mt-1 flex items-center gap-1.5 text-[15px] text-body/75 sm:text-base">
          <MapPin aria-hidden className="size-4 shrink-0 text-lagoon" strokeWidth={1.75} />
          {place}
        </p>
      )}
    </div>
  );
  const intro = <p>{introSentence(d)}</p>;

  const nearbyNode =
    nearby.length > 0 && clinic && d.primarySpecialty ? (
      <section aria-labelledby="nearby" className="space-y-5">
        <h2 id="nearby" className="font-display text-2xl font-semibold text-ink sm:text-3xl">
          Other {d.primarySpecialty.plural} in {clinic.area.name}
        </h2>
        <DoctorCardGrid doctors={nearby} />
      </section>
    ) : undefined;

  return (
    <>
      {jsonLd && <JsonLd data={profileJsonLd(d)} />}
      <Template doctor={d} seo={{ heading, intro, nearby: nearbyNode }} />
    </>
  );
}

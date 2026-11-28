import { JsonLd } from "@/components/seo/JsonLd";
import { MapPin } from "lucide-react";
import { introSentence, primaryClinic, profileJsonLd, siteJsonLd } from "@/lib/seo/profile";
import { resolvePortfolioTemplate, type ReadyTemplates } from "@/templates/registry";
import type { PublicDoctor } from "@/templates/types";

/**
 * The shared SEO wrapper around a portfolio template: JSON-LD, H1 and intro
 * are rendered here, identically for every template. The
 * template owns the whole page around them (its own navbar, sections and
 * footer), so each design reads as the doctor's own one-page website. Used by
 * the public profile page, the sample pages and the admin previews.
 *
 * No "other doctors nearby" list: each design is the doctor's own personal
 * website, so it never links to other doctors.
 */
export function ProfileView({
  doctor: d,
  ready,
  jsonLd = true,
}: {
  doctor: PublicDoctor;
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

  return (
    <>
      {jsonLd && <JsonLd data={profileJsonLd(d)} />}
      {/* No own subdomain yet: the website is a MediReach page, so it carries MediReach's site name. */}
      {jsonLd && d.websiteUrl === d.url && <JsonLd data={siteJsonLd()} />}
      <Template doctor={d} seo={{ heading, intro }} />
    </>
  );
}

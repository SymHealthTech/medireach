import { DoctorCardGrid } from "@/components/public/DoctorCard";
import { PublicFooter, PublicHeader } from "@/components/public/PublicShell";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  introSentence,
  primaryClinic,
  profileBreadcrumbs,
  profileJsonLd,
  profileSubheading,
  quickFacts,
} from "@/lib/seo/profile";
import { absUrl } from "@/lib/site";
import { resolvePortfolioTemplate } from "@/templates/registry";
import type { DoctorCardData, PublicDoctor } from "@/templates/types";

/**
 * The shared SEO wrapper around a portfolio template: JSON-LD, H1, intro,
 * breadcrumbs, quick facts, nearby doctors and the registration footer are
 * rendered here, identically for every template. Used by the public profile
 * page and the admin preview.
 */
export function ProfileView({ doctor: d, nearby }: { doctor: PublicDoctor; nearby: DoctorCardData[] }) {
  const Template = resolvePortfolioTemplate(d.portfolioTemplateId);
  const clinic = primaryClinic(d);
  const facts = quickFacts(d);
  const subheading = profileSubheading(d);

  const heading = (
    <div>
      <h1 className="font-display text-[34px] font-semibold leading-[1.15] text-ink sm:text-5xl">{d.fullName}</h1>
      {subheading && <p className="mt-2 text-lg text-body">{subheading}</p>}
    </div>
  );
  const intro = <p>{introSentence(d)}</p>;

  return (
    <>
      <JsonLd data={profileJsonLd(d)} />
      <PublicHeader />
      <main className="mx-auto max-w-3xl space-y-5 px-4 pt-4 sm:px-6 sm:pt-6">
        <Breadcrumbs crumbs={profileBreadcrumbs(d)} />

        <Template doctor={d} seo={{ heading, intro }} />

        {facts.length > 0 && (
          <section aria-labelledby="quick-facts" className="rounded-xl border border-line bg-surface p-5 shadow-soft sm:p-6">
            <h2 id="quick-facts" className="font-display text-xl font-semibold text-ink sm:text-2xl">
              Quick facts
            </h2>
            <dl className="mt-4 space-y-4">
              {facts.map((f) => (
                <div key={f.question}>
                  <dt className="font-semibold text-ink">{f.question}</dt>
                  <dd className="mt-1 text-body">{f.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {nearby.length > 0 && clinic && d.primarySpecialty && (
          <section aria-labelledby="nearby" className="space-y-4 pt-2">
            <h2 id="nearby" className="font-display text-xl font-semibold text-ink sm:text-2xl">
              Other {d.primarySpecialty.plural} in {clinic.area.name}
            </h2>
            <DoctorCardGrid doctors={nearby} />
          </section>
        )}
      </main>

      <PublicFooter>
        <p className="border-b border-paper/15 pb-4 text-paper/80">
          Information provided by the doctor.
          {d.registration.number && (
            <>
              {" "}
              Verified registration: {[d.registration.council, d.registration.number].filter(Boolean).join(" ")}.
            </>
          )}{" "}
          Page by{" "}
          <a href={absUrl("/")} className="underline underline-offset-2">
            MediReach
          </a>
          .
        </p>
      </PublicFooter>
      {/* Room for the sticky contact bar on mobile. */}
      <div aria-hidden className="h-20 bg-ink sm:hidden" />
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DoctorCardGrid } from "@/components/public/DoctorCard";
import { PublicFooter, PublicHeader } from "@/components/public/PublicShell";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCityDoctorCards, getPublishedDoctor, getPublishedRoutes } from "@/lib/public/data";
import {
  introSentence,
  primaryClinic,
  profileBreadcrumbs,
  profileDescription,
  profileJsonLd,
  profileSubheading,
  profileTitle,
  quickFacts,
} from "@/lib/seo/profile";
import { absUrl } from "@/lib/site";
import { SLUG_RE } from "@/lib/slug";
import { resolvePortfolioTemplate } from "@/templates/registry";
import type { PublicDoctor } from "@/templates/types";

/**
 * Canonical doctor profile: /[city]/doctor/[slug].
 *
 * Static: published profiles are pre-rendered at build and any new one is
 * rendered on first request, then cached until `revalidateDoctorPages()` runs
 * on publish / edit / unpublish. Unpublished or unknown → 404.
 *
 * This file is the shared SEO wrapper: metadata, JSON-LD, H1, intro,
 * breadcrumbs, quick facts and nearby doctors are rendered here, identically
 * for every template. The template only lays out the content.
 */

export const revalidate = 86400; // safety net; on-demand revalidation is primary

type Params = { city: string; slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  try {
    const routes = await getPublishedRoutes();
    return routes.map((r) => ({ city: r.citySlug, slug: r.slug }));
  } catch (err) {
    console.warn("[profile] generateStaticParams: database unavailable, rendering on demand.", err);
    return [];
  }
}

async function load(params: Promise<Params>): Promise<PublicDoctor | null> {
  const { city, slug } = await params;
  if (!SLUG_RE.test(city) || !SLUG_RE.test(slug)) return null;
  return getPublishedDoctor(city, slug);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const d = await load(params);
  if (!d) return {};
  const title = profileTitle(d);
  const description = profileDescription(d);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: d.url },
    robots: d.seo.noindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: { type: "profile", url: d.url, title, description, siteName: "MediReach", locale: "en_IN" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function DoctorProfilePage({ params }: { params: Promise<Params> }) {
  const d = await load(params);
  if (!d) notFound();

  const Template = resolvePortfolioTemplate(d.portfolioTemplateId);
  const clinic = primaryClinic(d);
  const facts = quickFacts(d);
  const subheading = profileSubheading(d);

  const nearby =
    clinic && d.primarySpecialty
      ? (await getCityDoctorCards(d.citySlug))
          .filter(
            (c) =>
              c.id !== d.id &&
              c.specialtySlugs.includes(d.primarySpecialty!.slug) &&
              c.areaSlugs.includes(clinic.area.slug),
          )
          .slice(0, 6)
      : [];

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

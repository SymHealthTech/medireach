import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LAPSED_METADATA, LapsedNotice } from "@/components/public/LapsedNotice";
import { ProfileView } from "@/components/public/ProfileView";
import { getCityDoctorCards, getPublishedDoctor, getPublishedRoutes } from "@/lib/public/data";
import { getReadyTemplates } from "@/lib/public/templates";
import { primaryClinic, profileDescription, profileTitle } from "@/lib/seo/profile";
import { SLUG_RE } from "@/lib/slug";
import type { PublicDoctor } from "@/templates/types";

/**
 * Canonical doctor profile: /[city]/doctor/[slug].
 *
 * Static: published profiles are pre-rendered at build and any new one is
 * rendered on first request, then cached until `revalidateDoctorPages()` runs
 * on publish / edit / unpublish. Unpublished or unknown → 404. Lapsed (renewal
 * unpaid after the grace period) → "temporarily unavailable" notice, noindex.
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
  if (d.lapsed) return LAPSED_METADATA;
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
  if (d.lapsed) return <LapsedNotice />;

  const clinic = primaryClinic(d);
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

  return <ProfileView doctor={d} nearby={nearby} ready={await getReadyTemplates()} />;
}

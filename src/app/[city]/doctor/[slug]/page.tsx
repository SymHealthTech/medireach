import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DoctorListing } from "@/components/public/DoctorListing";
import { LAPSED_METADATA, LapsedNotice } from "@/components/public/LapsedNotice";
import { ProfileView } from "@/components/public/ProfileView";
import { getPublishedDoctor, getPublishedRoutes } from "@/lib/public/data";
import { getReadyTemplates } from "@/lib/public/templates";
import { listingDescription, listingTitle, profileDescription, profileTitle } from "@/lib/seo/profile";
import { SLUG_RE } from "@/lib/slug";
import type { PublicDoctor } from "@/templates/types";

/**
 * The doctor's MediReach listing: /[city]/doctor/[slug].
 *
 * Every live doctor has their own website on a subdomain (amit.medireach.co.in,
 * served by ./website/page.tsx through the middleware). This folder URL is
 * MediReach's listing about them: different content (MediReach's look, the
 * facts, breadcrumbs and a link to the website), its own canonical, so Google
 * can show both the website and the MediReach page. A doctor without a
 * subdomain yet gets the full website here instead, as before.
 *
 * Static: published profiles are pre-rendered at build and any new one is
 * rendered on first request, then cached until `revalidateDoctorPages()` runs
 * on publish / edit / unpublish. Unpublished or unknown → 404. Lapsed (renewal
 * unpaid after the grace period) → "temporarily unavailable" notice, noindex.
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
  // With a subdomain this is the listing; without one it is still the website.
  const listing = Boolean(d.subdomain);
  const title = listing ? listingTitle(d) : profileTitle(d);
  const description = listing ? listingDescription(d) : profileDescription(d);
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

  if (d.subdomain) return <DoctorListing doctor={d} />;
  return <ProfileView doctor={d} ready={await getReadyTemplates()} />;
}

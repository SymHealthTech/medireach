import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LAPSED_METADATA, LapsedNotice } from "@/components/public/LapsedNotice";
import { ProfileView } from "@/components/public/ProfileView";
import { getPublishedDoctor, getPublishedRoutes } from "@/lib/public/data";
import { getReadyTemplates } from "@/lib/public/templates";
import { profileDescription, profileTitle } from "@/lib/seo/profile";
import { absUrl, paths } from "@/lib/site";
import { SLUG_RE } from "@/lib/slug";
import type { PublicDoctor } from "@/templates/types";

/**
 * The doctor's own website, as served on their subdomain
 * (amit.medireach.co.in → middleware rewrite to /[city]/doctor/[slug]/website).
 * Its canonical is the subdomain itself, so Google lists the website under
 * the doctor's own address; the folder URL is the separate MediReach listing.
 * The middleware 404s this path on the apex, and a doctor without a
 * subdomain has no page here (their folder URL is the website).
 */

export const revalidate = 86400; // safety net; on-demand revalidation is primary

type Params = { city: string; slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  try {
    return (await getPublishedRoutes()).filter((r) => r.subdomain).map((r) => ({ city: r.citySlug, slug: r.slug }));
  } catch (err) {
    console.warn("[website] generateStaticParams: database unavailable, rendering on demand.", err);
    return [];
  }
}

async function load(params: Promise<Params>): Promise<PublicDoctor | null> {
  const { city, slug } = await params;
  if (!SLUG_RE.test(city) || !SLUG_RE.test(slug)) return null;
  const d = await getPublishedDoctor(city, slug);
  return d?.subdomain ? d : null;
}

const ogImage = (d: PublicDoctor) => absUrl(`${paths.doctor(d.citySlug, d.slug)}/opengraph-image`);

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const d = await load(params);
  if (!d) return {};
  if (d.lapsed) return LAPSED_METADATA;
  const title = profileTitle(d);
  const description = profileDescription(d);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: d.websiteUrl },
    robots: d.seo.noindex ? { index: false, follow: true } : { index: true, follow: true },
    // The link preview image lives with the listing (…/[slug]/opengraph-image); nested pages don't inherit it.
    openGraph: { type: "profile", url: d.websiteUrl, title, description, siteName: d.fullName, locale: "en_IN", images: [{ url: ogImage(d), width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [ogImage(d)] },
  };
}

export default async function DoctorWebsitePage({ params }: { params: Promise<Params> }) {
  const d = await load(params);
  if (!d) notFound();
  if (d.lapsed) return <LapsedNotice />;
  return <ProfileView doctor={d} ready={await getReadyTemplates()} />;
}

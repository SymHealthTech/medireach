import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CardPageFooter, CardPageHeader, PatientCardView } from "@/components/cards/DigitalCardPage";
import { getPublishedDoctor } from "@/lib/public/data";
import { SLUG_RE } from "@/lib/slug";
import { absUrl, paths } from "@/lib/site";

/**
 * Public visiting-card page: /[city]/doctor/[slug]/card (also served as
 * {subdomain}.medireach.co.in/card). Patient view only: the card and a Share
 * button. The download / print tools are in the doctor's account
 * (/account/card). Meant for sharing a link, so it is noindex.
 */

export const revalidate = 86400;
export async function generateStaticParams() {
  return [];
}

type Params = { city: string; slug: string };

async function load(params: Promise<Params>) {
  const { city, slug } = await params;
  return SLUG_RE.test(city) && SLUG_RE.test(slug) ? getPublishedDoctor(city, slug) : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const d = await load(params);
  if (!d) return {};
  return {
    title: { absolute: `${d.fullName} – visiting card | MediReach` },
    description: `Visiting card of ${d.fullName}${d.primarySpecialty ? `, ${d.primarySpecialty.name}` : ""}. Scan or tap for timings, address and contact.`,
    robots: { index: false, follow: true },
    alternates: { canonical: absUrl(`${paths.doctor(d.citySlug, d.slug)}/card`) },
  };
}

export default async function CardPage({ params }: { params: Promise<Params> }) {
  const d = await load(params);
  if (!d) notFound();
  const cardUrl = d.subdomain ? `${d.shareUrl.replace(/\/$/, "")}/card` : absUrl(`${paths.doctor(d.citySlug, d.slug)}/card`);
  return (
    <div className="flex min-h-dvh flex-col bg-mist">
      <CardPageHeader backHref={d.url} backLabel="Back" />
      <PatientCardView doctor={d} websiteUrl={d.url} cardUrl={cardUrl} />
      <CardPageFooter />
    </div>
  );
}

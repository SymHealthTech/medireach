import "server-only";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LAPSED_METADATA, LapsedNotice } from "@/components/public/LapsedNotice";
import { SiteView } from "@/components/public/SiteView";
import { getPublishedEstablishment, getPublishedEstablishmentRoutes } from "@/lib/public/establishments";
import { getReadyTemplates } from "@/lib/public/templates";
import { establishmentDescription, establishmentTitle, seoInputOf } from "@/lib/seo/establishment";
import { SLUG_RE } from "@/lib/slug";
import type { PublicEstablishment } from "@/templates/types";

/**
 * Canonical clinic and hospital sites: /[city]/clinic/[slug] and
 * /[city]/hospital/[slug]. Same rendering approach as doctor profiles: static,
 * pre-rendered for published sites, refreshed on publish/edit/unpublish via
 * the `establishments` tag. Unpublished or unknown → 404. Lapsed → "temporarily
 * unavailable" notice, noindex.
 */

type Params = { city: string; slug: string };

export function siteRoute(kind: "clinic" | "hospital") {
  async function load(params: Promise<Params>): Promise<PublicEstablishment | null> {
    const { city, slug } = await params;
    if (!SLUG_RE.test(city) || !SLUG_RE.test(slug)) return null;
    return getPublishedEstablishment(kind, city, slug);
  }

  async function generateStaticParams(): Promise<Params[]> {
    try {
      return (await getPublishedEstablishmentRoutes()).filter((r) => r.kind === kind).map((r) => ({ city: r.citySlug, slug: r.slug }));
    } catch (err) {
      console.warn(`[${kind}] generateStaticParams: database unavailable, rendering on demand.`, err);
      return [];
    }
  }

  async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
    const s = await load(params);
    if (!s) return {};
    if (s.lapsed) return LAPSED_METADATA;
    const input = seoInputOf(s);
    const title = establishmentTitle(input);
    const description = establishmentDescription(input);
    return {
      title: { absolute: title },
      description,
      alternates: { canonical: s.url },
      robots: s.seo.noindex ? { index: false, follow: true } : { index: true, follow: true },
      openGraph: { type: "website", url: s.url, title, description, siteName: "MediReach", locale: "en_IN" },
      twitter: { card: "summary_large_image", title, description },
    };
  }

  async function Page({ params }: { params: Promise<Params> }) {
    const s = await load(params);
    if (!s) notFound();
    if (s.lapsed) return <LapsedNotice />;
    return <SiteView site={s} ready={await getReadyTemplates()} />;
  }

  return { generateStaticParams, generateMetadata, Page };
}

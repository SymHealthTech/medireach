import "server-only";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LAPSED_METADATA, LapsedNotice } from "@/components/public/LapsedNotice";
import { SiteListing } from "@/components/public/SiteListing";
import { SiteView } from "@/components/public/SiteView";
import { getPublishedEstablishment, getPublishedEstablishmentRoutes } from "@/lib/public/establishments";
import { getReadyTemplates } from "@/lib/public/templates";
import { establishmentDescription, establishmentListingDescription, establishmentListingTitle, establishmentTitle, seoInputOf } from "@/lib/seo/establishment";
import { SLUG_RE } from "@/lib/slug";
import type { PublicEstablishment } from "@/templates/types";

/**
 * Clinic and hospital pages, the same split as doctors:
 *
 * - /[city]/clinic/[slug] and /[city]/hospital/[slug] (`siteRoute`): the
 *   MediReach listing when the site has its own subdomain, else the full site.
 * - …/[slug]/website (`siteWebsiteRoute`): the site's own website, reached only
 *   as shreeskin.medireach.co.in (middleware rewrite), canonical on the subdomain.
 *
 * Static, pre-rendered for published sites, refreshed on publish/edit/unpublish
 * via the `establishments` tag. Unpublished or unknown → 404. Lapsed → "temporarily
 * unavailable" notice, noindex.
 */

type Params = { city: string; slug: string };

function routeParts(kind: "clinic" | "hospital", website: boolean) {
  async function load(params: Promise<Params>): Promise<PublicEstablishment | null> {
    const { city, slug } = await params;
    if (!SLUG_RE.test(city) || !SLUG_RE.test(slug)) return null;
    const s = await getPublishedEstablishment(kind, city, slug);
    // The website page exists only for sites with a subdomain.
    return s && (!website || s.websiteUrl !== s.url) ? s : null;
  }

  async function generateStaticParams(): Promise<Params[]> {
    try {
      return (await getPublishedEstablishmentRoutes())
        .filter((r) => r.kind === kind && (!website || r.subdomain))
        .map((r) => ({ city: r.citySlug, slug: r.slug }));
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
    const listing = !website && s.websiteUrl !== s.url;
    const title = listing ? establishmentListingTitle(input) : establishmentTitle(input);
    const description = listing ? establishmentListingDescription(input) : establishmentDescription(input);
    const url = website ? s.websiteUrl : s.url;
    // The website page is nested under the listing, which owns the preview image; nested pages don't inherit it.
    const images = website ? [{ url: `${s.url}/opengraph-image`, width: 1200, height: 630 }] : undefined;
    return {
      title: { absolute: title },
      description,
      alternates: { canonical: url },
      robots: s.seo.noindex ? { index: false, follow: true } : { index: true, follow: true },
      openGraph: { type: "website", url, title, description, siteName: website ? s.name : "MediReach", locale: "en_IN", ...(images ? { images } : {}) },
      twitter: { card: "summary_large_image", title, description, ...(images ? { images: images.map((i) => i.url) } : {}) },
    };
  }

  async function Page({ params }: { params: Promise<Params> }) {
    const s = await load(params);
    if (!s) notFound();
    if (s.lapsed) return <LapsedNotice />;
    if (!website && s.websiteUrl !== s.url) return <SiteListing site={s} />;
    return <SiteView site={s} ready={await getReadyTemplates()} />;
  }

  return { generateStaticParams, generateMetadata, Page };
}

/** The folder URL: MediReach listing (or the full site when it has no subdomain yet). */
export const siteRoute = (kind: "clinic" | "hospital") => routeParts(kind, false);

/** The site's own website, served on its subdomain. */
export const siteWebsiteRoute = (kind: "clinic" | "hospital") => routeParts(kind, true);

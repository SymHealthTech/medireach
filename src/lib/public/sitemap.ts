import "server-only";
import type { MetadataRoute } from "next";
import { getPublishedRoutes } from "@/lib/public/data";
import { getPublishedEstablishmentRoutes } from "@/lib/public/establishments";
import { nonEmptyHubs } from "@/lib/public/hubs";
import { absUrl, paths, sitePath, subdomainUrl } from "@/lib/site";

/**
 * Sitemap entries: marketing pages, every published, indexable doctor, clinic
 * and hospital listing (folder URL), their own websites (subdomain URLs) and
 * every non-empty hub. Chunked for `generateSitemaps`.
 *
 * The website URLs are on other hosts: Google accepts them here when the
 * whole domain (medireach.co.in) is verified in Search Console as a Domain
 * property. Each subdomain also serves its own /sitemap.xml, named in its
 * robots.txt, so new websites are found either way.
 */

export const SITEMAP_CHUNK_SIZE = 5000;

/** Marketing pages (sample pages and /login are noindex, so not listed). */
export const MARKETING_PATHS = ["/", "/pricing", "/for-doctors", "/for-clinics", "/for-hospitals", "/designs", "/visiting-cards", "/contact", "/terms", "/privacy"];

export async function allSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const [profiles, sites, hubs] = await Promise.all([getPublishedRoutes(), getPublishedEstablishmentRoutes(), nonEmptyHubs()]);
  return [
    ...MARKETING_PATHS.map((p) => ({ url: absUrl(p), changeFrequency: "weekly" as const, priority: 1 })),
    ...profiles.filter((r) => !r.noindex).map((r) => ({
      url: absUrl(paths.doctor(r.citySlug, r.slug)),
      lastModified: r.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...sites.filter((r) => !r.noindex).map((r) => ({
      url: absUrl(sitePath(r)),
      lastModified: r.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...[...profiles, ...sites]
      .filter((r) => !r.noindex && r.subdomain)
      .map((r) => ({ url: subdomainUrl(r.subdomain!), lastModified: r.updatedAt, changeFrequency: "weekly" as const, priority: 1 })),
    ...hubs.map((h) => ({ url: h.url, lastModified: h.lastModified, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}

export async function sitemapChunkCount(): Promise<number> {
  const entries = await allSitemapEntries();
  return Math.max(1, Math.ceil(entries.length / SITEMAP_CHUNK_SIZE));
}

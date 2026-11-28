import { getPublishedDoctor, getRouteBySubdomain } from "@/lib/public/data";
import { getPublishedEstablishment } from "@/lib/public/establishments";
import { subdomainUrl } from "@/lib/site";
import { subdomainError } from "@/lib/slug";

/**
 * A site's own sitemap: amit.medireach.co.in/sitemap.xml (middleware rewrite;
 * 404 on the apex). Lists the website's home page, which is all it has to
 * index; robots.txt on the subdomain points here. The apex sitemaps list the
 * MediReach listings (and these websites too, for a Search Console domain
 * property).
 */
export const revalidate = 3600;

export async function GET(_req: Request, { params }: { params: Promise<{ sub: string }> }) {
  const { sub } = await params;
  const route = subdomainError(sub) === null ? await getRouteBySubdomain(sub) : null;
  const site = !route
    ? null
    : route.kind === "doctor"
      ? await getPublishedDoctor(route.citySlug, route.slug)
      : await getPublishedEstablishment(route.kind, route.citySlug, route.slug);
  if (!site || site.lapsed) return new Response("Not found", { status: 404 });

  const urls = site.seo.noindex ? [] : [{ loc: subdomainUrl(sub), lastmod: site.updatedAt }];
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n`).join("") +
    `</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}

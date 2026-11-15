import { sitemapChunkCount } from "@/lib/public/sitemap";
import { absUrl } from "@/lib/site";

/** Sitemap index listing every chunk. Submit this URL in Search Console. */
export const revalidate = 3600;

export async function GET() {
  const n = await sitemapChunkCount();
  const now = new Date().toISOString();
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    Array.from({ length: n }, (_, i) => `  <sitemap><loc>${absUrl(`/sitemap/${i}.xml`)}</loc><lastmod>${now}</lastmod></sitemap>\n`).join("") +
    `</sitemapindex>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}

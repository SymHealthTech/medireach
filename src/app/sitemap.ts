import type { MetadataRoute } from "next";
import { allSitemapEntries, SITEMAP_CHUNK_SIZE, sitemapChunkCount } from "@/lib/public/sitemap";

/**
 * Chunked sitemaps at /sitemap/0.xml, /sitemap/1.xml, … (5,000 URLs each).
 * /sitemap_index.xml lists them all; robots.txt points there.
 */

export const revalidate = 3600;

export async function generateSitemaps() {
  try {
    const n = await sitemapChunkCount();
    return Array.from({ length: n }, (_, id) => ({ id }));
  } catch (err) {
    console.warn("[sitemap] database unavailable at build; serving a single chunk.", err);
    return [{ id: 0 }];
  }
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const entries = await allSitemapEntries();
  const start = Number(id) * SITEMAP_CHUNK_SIZE;
  return entries.slice(start, start + SITEMAP_CHUNK_SIZE);
}

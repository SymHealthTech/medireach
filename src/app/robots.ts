import type { MetadataRoute } from "next";
import { absUrl } from "@/lib/site";

/**
 * Same rules on the apex and on doctor subdomains: crawling is allowed so
 * Google can read each subdomain page's canonical (the apex folder URL).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/api"] }],
    sitemap: absUrl("/sitemap_index.xml"),
  };
}

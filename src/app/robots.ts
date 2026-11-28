import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { SAMPLE_SUBDOMAINS } from "@/config/reserved";
import { absUrl, ROOT_HOSTNAME, SITE_PORT, SITE_PROTOCOL } from "@/lib/site";

/**
 * The apex names its sitemap index (every listing, hub and website). Each
 * site subdomain (amit.medireach.co.in) names its own /sitemap.xml, so Google
 * finds and indexes every new website as soon as it is published, without
 * anyone submitting it.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = ((await headers()).get("host") ?? "").split(":")[0]!.toLowerCase();
  const sub = host.endsWith(`.${ROOT_HOSTNAME}`) ? host.slice(0, -(ROOT_HOSTNAME.length + 1)) : "";
  if (sub && sub !== "www" && !sub.includes(".") && !SAMPLE_SUBDOMAINS[sub]) {
    const origin = `${SITE_PROTOCOL}//${host}${SITE_PORT ? `:${SITE_PORT}` : ""}`;
    return { rules: [{ userAgent: "*", allow: "/" }], sitemap: `${origin}/sitemap.xml` };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/api"] }],
    sitemap: absUrl("/sitemap_index.xml"),
  };
}

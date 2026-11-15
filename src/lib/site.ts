/**
 * Public site URLs. Edge-safe (used by middleware). Every link on profile and
 * hub pages is absolute on the apex domain, so the same HTML is correct when
 * served on a doctor's subdomain (amit.medireach.co.in).
 */

export const SITE_NAME = "MediReach";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

const site = new URL(SITE_URL);

/** "medireach.co.in" in production, "localhost" in dev. */
export const ROOT_HOSTNAME = site.hostname;
export const SITE_PROTOCOL = site.protocol; // "https:" | "http:"
export const SITE_PORT = site.port; // "" in production

/** Absolute apex URL for a path ("/pune" → "https://medireach.co.in/pune"). */
export function absUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Doctor's own subdomain URL ("https://amit.medireach.co.in"). */
export function subdomainUrl(subdomain: string): string {
  const port = SITE_PORT ? `:${SITE_PORT}` : "";
  return `${SITE_PROTOCOL}//${subdomain}.${ROOT_HOSTNAME}${port}`;
}

export const paths = {
  city: (city: string) => `/${city}`,
  specialty: (city: string, specialty: string) => `/${city}/${specialty}`,
  specialtyArea: (city: string, specialty: string, area: string) => `/${city}/${specialty}/${area}`,
  area: (city: string, area: string) => `/${city}/area/${area}`,
  doctor: (city: string, slug: string) => `/${city}/doctor/${slug}`,
  doctorVcf: (city: string, slug: string) => `/${city}/doctor/${slug}/contact.vcf`,
  short: (shortSlug: string) => `/${shortSlug}`,
};

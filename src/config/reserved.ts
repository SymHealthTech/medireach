/**
 * Reserved URL segments and subdomains. Every city / specialty / area slug and
 * every doctor subdomain is validated against these so public routes never
 * collide (see MEDIREACH_BUILD_PROMPT.md, Phase 2 "Routes").
 */

/** Top-level segments that can never be a city slug (or a doctor short slug). */
export const RESERVED_SLUGS = [
  "admin",
  "api",
  "login",
  "logout",
  "account",
  "pricing",
  "designs",
  "for-clinics",
  "for-hospitals",
  "doctor",
  "doctors",
  "clinic",
  "clinics",
  "hospital",
  "hospitals",
  "area",
  "terms",
  "privacy",
  "contact",
  "sitemap",
  "sitemap.xml",
  "robots",
  "robots.txt",
  "favicon.ico",
  "icon",
  "apple-icon",
  "opengraph-image",
  "manifest",
  "_next",
  "static",
  "assets",
  "public",
  "about",
  "help",
  "support",
  "blog",
  "search",
  "card",
  "go",
  "sample",
  "sitemap_index.xml",
] as const;

/**
 * Second-level segments under `/[city]/…` that are fixed routes, so a
 * specialty slug may never take them (`/[city]/[specialty]` vs
 * `/[city]/area/…`, `/[city]/doctor/…`, `/[city]/clinic/…`,
 * `/[city]/clinics/…`, `/[city]/hospital/…`, `/[city]/hospitals/…`).
 */
export const RESERVED_CITY_SUBPATHS = [
  "area",
  "doctor",
  "doctors",
  "clinic",
  "clinics",
  "hospital",
  "hospitals",
  "specialty",
  "specialties",
] as const;

export const RESERVED_SUBDOMAINS = [
  "www",
  "app",
  // The clinic software (repo medireach-clinic) runs at clinicapp.medireach.co.in.
  "clinicapp",
  "clinic",
  "clinics",
  "admin",
  "api",
  "mail",
  "email",
  "blog",
  "cdn",
  "static",
  "assets",
  "help",
  "support",
  "status",
  "dev",
  "staging",
  "test",
  "m",
  "ftp",
  "ns1",
  "ns2",
  "medireach",
  // Sample doctor addresses (see SAMPLE_SUBDOMAINS): never available to real doctors.
  "draditisample",
] as const;

/**
 * Subdomains that show a built-in sample doctor (no database): the address
 * printed on the homepage's sample visiting cards, so their QR codes work.
 * Value = the sample key under /sample/{key}. Each one is also in
 * RESERVED_SUBDOMAINS.
 */
export const SAMPLE_SUBDOMAINS: Record<string, string> = {
  draditisample: "gp",
};

/** Prefix that marks a top-level doctor short slug (`/dr-amit-shah`). */
export const DOCTOR_SHORT_SLUG_PREFIX = "dr-";

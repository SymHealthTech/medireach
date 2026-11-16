/** Cache tags for public pages. Revalidate these after any write. */
export const CACHE_TAGS = {
  /** Any published doctor's data: profiles, hubs, sitemaps, subdomain/short-link lookups. */
  doctors: "doctors",
  /** Cities, areas, specialties, degrees, councils. */
  masters: "masters",
  /** Template slot statuses (which designs are ready). */
  templates: "templates",
  /** Public settings shown on marketing pages (prices, contact, GST). */
  settings: "settings",
  /** Founding Doctor count (spots left on the homepage). */
  founding: "founding",
} as const;

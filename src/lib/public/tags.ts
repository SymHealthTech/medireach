/** Cache tags for public pages. Revalidate these after any write. */
export const CACHE_TAGS = {
  /** Any published doctor's data: profiles, hubs, sitemaps, subdomain/short-link lookups. */
  doctors: "doctors",
  /** Cities, areas, specialties, degrees, councils. */
  masters: "masters",
  /** Template slot statuses (which designs are ready). */
  templates: "templates",
} as const;

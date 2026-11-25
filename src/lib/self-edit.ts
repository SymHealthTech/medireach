/**
 * The editor sections owners edit themselves (everything except the page
 * address/SEO, business and publishing). Plain module so both the server
 * (actions, pages) and the client editors can import it.
 */
export const DOCTOR_SELF_STEPS = ["basics", "registration", "practice", "clinics", "contact", "about", "templates"] as const;
export type DoctorSelfStep = (typeof DOCTOR_SELF_STEPS)[number];

export const SITE_SELF_STEPS = ["basics", "location", "timings", "services", "doctors", "extras", "gallery", "design"] as const;
export type SiteSelfStep = (typeof SITE_SELF_STEPS)[number];

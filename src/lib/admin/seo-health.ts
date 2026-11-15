import type { DoctorProfileDoc } from "@/models/DoctorProfile";

/** Recommended-but-missing fields that weaken a page in Google (shared by Portfolio pages and SEO). */
export function seoHealth(
  d: Pick<DoctorProfileDoc, "photo" | "shortBio" | "clinics" | "seo" | "compliance">,
): { missing: string[]; issues: number; noindex: boolean } {
  const missing: string[] = [];
  if (!d.photo) missing.push("Photo");
  if (!d.shortBio) missing.push("Short bio");
  if (d.clinics.length === 0) missing.push("Clinic");
  if (d.clinics.some((c) => !c.geo)) missing.push("Map location");
  if (d.clinics.some((c) => !c.timings?.some((t) => t.slots.length > 0))) missing.push("Timings");
  return { missing, issues: d.compliance?.issues?.length ?? 0, noindex: Boolean(d.seo?.noindex) };
}

export const SEO_HEALTH_SELECT = {
  photo: 1,
  shortBio: 1,
  "clinics.geo": 1,
  "clinics.timings": 1,
  "clinics.areaId": 1,
  seo: 1,
  "compliance.issues": 1,
} as const;

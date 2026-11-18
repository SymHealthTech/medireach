import type { DoctorProfileDoc } from "@/models/DoctorProfile";
import type { EstablishmentDoc } from "@/models/Establishment";

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

/** The same check for clinic and hospital sites. */
export function siteSeoHealth(
  e: Pick<EstablishmentDoc, "logo" | "shortDescription" | "geo" | "is24x7" | "timings" | "gallery" | "seo" | "compliance">,
): { missing: string[]; issues: number; noindex: boolean } {
  const missing: string[] = [];
  if (!e.logo) missing.push("Logo");
  if (!e.shortDescription) missing.push("Short description");
  if (!e.geo) missing.push("Map location");
  if (!e.is24x7 && !e.timings?.some((t) => t.slots.length > 0)) missing.push("Timings");
  if (!e.gallery?.length) missing.push("Photos");
  return { missing, issues: e.compliance?.issues?.length ?? 0, noindex: Boolean(e.seo?.noindex) };
}

export const SITE_SEO_HEALTH_SELECT = {
  logo: 1,
  shortDescription: 1,
  geo: 1,
  is24x7: 1,
  timings: 1,
  "gallery.url": 1,
  seo: 1,
  "compliance.issues": 1,
} as const;

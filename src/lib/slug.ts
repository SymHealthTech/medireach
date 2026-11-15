import {
  DOCTOR_SHORT_SLUG_PREFIX,
  RESERVED_CITY_SUBPATHS,
  RESERVED_SLUGS,
  RESERVED_SUBDOMAINS,
} from "@/config/reserved";
import { LIMITS } from "@/lib/constants";

/**
 * URL slug helpers shared by models, seeds and the dashboard's live
 * availability checks.
 */

/** "Dr. Amit  Shah (MD)" → "dr-amit-shah-md". ASCII only, hyphen-separated. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Canonical profile slug: dr-{first}-{last}-{primary-specialty-slug}. */
export function doctorSlug(firstName: string, lastName: string, specialtySlug: string): string {
  return slugify(`dr ${firstName} ${lastName} ${specialtySlug}`);
}

/** Base short slug: dr-{first}-{last}. Clashes get `-{area}` then `-2`, `-3`… */
export function doctorShortSlugBase(firstName: string, lastName: string): string {
  return slugify(`dr ${firstName} ${lastName}`);
}

/** Candidate short slugs in the order they should be tried. */
export function* shortSlugCandidates(
  firstName: string,
  lastName: string,
  areaSlug?: string,
): Generator<string> {
  const base = doctorShortSlugBase(firstName, lastName);
  yield base;
  if (areaSlug) yield `${base}-${areaSlug}`;
  for (let n = 2; ; n++) yield `${base}-${n}`;
}

export type MasterSlugKind = "city" | "specialty" | "area";

/**
 * Validate a city/specialty/area slug against the route table. Returns an
 * error message, or null when the slug is usable. (Uniqueness against the
 * database is checked separately by the caller / unique indexes.)
 */
export function masterSlugError(kind: MasterSlugKind, slug: string): string | null {
  if (!SLUG_RE.test(slug)) return "Use lowercase letters, numbers and single hyphens.";
  if (slug.startsWith(DOCTOR_SHORT_SLUG_PREFIX)) {
    return `Slugs can't start with "${DOCTOR_SHORT_SLUG_PREFIX}" (reserved for doctor links).`;
  }
  if (kind === "city" && (RESERVED_SLUGS as readonly string[]).includes(slug)) {
    return `"${slug}" is a reserved site path.`;
  }
  if (kind === "specialty" && (RESERVED_CITY_SUBPATHS as readonly string[]).includes(slug)) {
    return `"${slug}" is a reserved path under the city.`;
  }
  return null;
}

export const SUBDOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/** Validate a doctor subdomain. Returns an error message or null. */
export function subdomainError(sub: string): string | null {
  if (sub.length < LIMITS.subdomainMin || sub.length > LIMITS.subdomainMax) {
    return `Use ${LIMITS.subdomainMin}–${LIMITS.subdomainMax} characters.`;
  }
  if (!SUBDOMAIN_RE.test(sub) || sub.includes("--")) {
    return "Use lowercase letters, numbers and single hyphens (not at the start or end).";
  }
  if ((RESERVED_SUBDOMAINS as readonly string[]).includes(sub)) return `"${sub}" is reserved.`;
  return null;
}

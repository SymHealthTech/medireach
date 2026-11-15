import "server-only";
import { getCityDoctorCards, getMasters, type AreaMaster, type CityMaster, type SpecialtyMaster } from "@/lib/public/data";
import { SLUG_RE } from "@/lib/slug";
import { absUrl, paths } from "@/lib/site";
import type { DoctorCardData } from "@/templates/types";

/**
 * Hub resolution + listing. Hubs list published doctors in neutral
 * alphabetical order only — never paid or "featured" ranking (NMC).
 * A doctor appears in a specialty hub for their primary or secondary
 * specialties, and in an area hub for any of their clinics' areas.
 */

export interface HubLink {
  name: string;
  url: string;
  count: number;
}

export interface CityContext {
  city: CityMaster;
  areas: AreaMaster[];
  specialties: SpecialtyMaster[];
  doctors: DoctorCardData[];
}

export async function loadCity(citySlug: string): Promise<CityContext | null> {
  if (!SLUG_RE.test(citySlug)) return null;
  const masters = await getMasters();
  const city = masters.cities.find((c) => c.slug === citySlug);
  if (!city) return null;
  return {
    city,
    areas: masters.areas.filter((a) => a.cityId === city.id),
    specialties: masters.specialties,
    doctors: await getCityDoctorCards(citySlug),
  };
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "en");

export const inSpecialty = (slug: string) => (d: DoctorCardData) => d.specialtySlugs.includes(slug);
export const inArea = (slug: string) => (d: DoctorCardData) => d.areaSlugs.includes(slug);

/** Specialties that have ≥1 doctor among `doctors`, with counts. */
export function specialtyLinks(
  ctx: CityContext,
  doctors: DoctorCardData[],
  url: (s: SpecialtyMaster) => string,
): HubLink[] {
  return ctx.specialties
    .map((s) => ({ name: s.plural, url: url(s), count: doctors.filter(inSpecialty(s.slug)).length }))
    .filter((l) => l.count > 0)
    .sort(byName);
}

/** Areas that have ≥1 doctor among `doctors`, with counts. */
export function areaLinks(ctx: CityContext, doctors: DoctorCardData[], url: (a: AreaMaster) => string): HubLink[] {
  return ctx.areas
    .map((a) => ({ name: a.name, url: url(a), count: doctors.filter(inArea(a.slug)).length }))
    .filter((l) => l.count > 0)
    .sort(byName);
}

/** Every non-empty hub URL with its latest doctor update (for the sitemap). */
export async function nonEmptyHubs(): Promise<{ url: string; lastModified: string }[]> {
  const masters = await getMasters();
  const out: { url: string; lastModified: string }[] = [];
  const latest = (docs: DoctorCardData[]) => docs.map((d) => d.updatedAt).sort().at(-1)!;

  for (const city of masters.cities) {
    const doctors = await getCityDoctorCards(city.slug);
    if (doctors.length === 0) continue;
    out.push({ url: absUrl(paths.city(city.slug)), lastModified: latest(doctors) });
    const areas = masters.areas.filter((a) => a.cityId === city.id);

    for (const s of masters.specialties) {
      const inS = doctors.filter(inSpecialty(s.slug));
      if (inS.length === 0) continue;
      out.push({ url: absUrl(paths.specialty(city.slug, s.slug)), lastModified: latest(inS) });
      for (const a of areas) {
        const inSA = inS.filter(inArea(a.slug));
        if (inSA.length > 0) {
          out.push({ url: absUrl(paths.specialtyArea(city.slug, s.slug, a.slug)), lastModified: latest(inSA) });
        }
      }
    }
    for (const a of areas) {
      const inA = doctors.filter(inArea(a.slug));
      if (inA.length > 0) out.push({ url: absUrl(paths.area(city.slug, a.slug)), lastModified: latest(inA) });
    }
  }
  return out;
}

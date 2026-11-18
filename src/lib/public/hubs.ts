import "server-only";
import { getCityDoctorCards, getMasters, type AreaMaster, type CityMaster, type SpecialtyMaster } from "@/lib/public/data";
import { getCitySiteCards, getClinicCategories, type CategoryMaster } from "@/lib/public/establishments";
import { SLUG_RE } from "@/lib/slug";
import { absUrl, paths } from "@/lib/site";
import type { DoctorCardData, SiteCardData } from "@/templates/types";

/**
 * Hub resolution + listing. Hubs list published doctors, clinics and hospitals
 * in neutral alphabetical order only, never paid or "featured" ranking (NMC).
 * A doctor appears in a specialty hub for their primary or secondary
 * specialties, and in an area hub for any of their clinics' areas. A clinic
 * appears in its category hub; hospitals have their own hubs.
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
  /** Clinic categories (the hospital category is left out: hospitals have their own hubs). */
  categories: CategoryMaster[];
  /** Published clinics and hospitals in the city, alphabetical. */
  sites: SiteCardData[];
}

export async function loadCity(citySlug: string): Promise<CityContext | null> {
  if (!SLUG_RE.test(citySlug)) return null;
  const masters = await getMasters();
  const city = masters.cities.find((c) => c.slug === citySlug);
  if (!city) return null;
  const [doctors, sites, categories] = await Promise.all([getCityDoctorCards(citySlug), getCitySiteCards(citySlug), getClinicCategories()]);
  return {
    city,
    areas: masters.areas.filter((a) => a.cityId === city.id),
    specialties: masters.specialties,
    doctors,
    categories: categories.filter((c) => c.kind === "clinic"),
    sites,
  };
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "en");

export const inSpecialty = (slug: string) => (d: DoctorCardData) => d.specialtySlugs.includes(slug);
export const inArea = (slug: string) => (d: DoctorCardData) => d.areaSlugs.includes(slug);

export const clinicsOf = (sites: SiteCardData[]) => sites.filter((s) => s.kind === "clinic");
export const hospitalsOf = (sites: SiteCardData[]) => sites.filter((s) => s.kind === "hospital");
export const inCategory = (slug: string) => (s: SiteCardData) => s.category?.slug === slug;
export const siteInArea = (slug: string) => (s: SiteCardData) => s.area.slug === slug;

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

/** Areas with anything listed (doctors, clinics or hospitals), with combined counts. */
export function allAreaLinks(ctx: CityContext, url: (a: AreaMaster) => string): HubLink[] {
  return ctx.areas
    .map((a) => ({ name: a.name, url: url(a), count: ctx.doctors.filter(inArea(a.slug)).length + ctx.sites.filter(siteInArea(a.slug)).length }))
    .filter((l) => l.count > 0)
    .sort(byName);
}

/** Clinic categories that have ≥1 published clinic among the sites, with counts. */
export function categoryLinks(ctx: CityContext, sites: SiteCardData[], url: (c: CategoryMaster) => string): HubLink[] {
  return ctx.categories
    .map((c) => ({ name: c.plural, url: url(c), count: sites.filter(inCategory(c.slug)).length }))
    .filter((l) => l.count > 0)
    .sort(byName);
}

/** Areas that have ≥1 of the sites, with counts. */
export function siteAreaLinks(ctx: CityContext, sites: SiteCardData[], url: (a: AreaMaster) => string): HubLink[] {
  return ctx.areas
    .map((a) => ({ name: a.name, url: url(a), count: sites.filter(siteInArea(a.slug)).length }))
    .filter((l) => l.count > 0)
    .sort(byName);
}

/** Every non-empty hub URL with its latest update (for the sitemap). Empty hubs are noindex and left out. */
export async function nonEmptyHubs(): Promise<{ url: string; lastModified: string }[]> {
  const masters = await getMasters();
  const categories = (await getClinicCategories()).filter((c) => c.kind === "clinic");
  const out: { url: string; lastModified: string }[] = [];
  const latest = (items: { updatedAt: string }[]) => items.map((d) => d.updatedAt).sort().at(-1)!;

  for (const city of masters.cities) {
    const [doctors, sites] = await Promise.all([getCityDoctorCards(city.slug), getCitySiteCards(city.slug)]);
    if (doctors.length === 0 && sites.length === 0) continue;
    out.push({ url: absUrl(paths.city(city.slug)), lastModified: latest([...doctors, ...sites]) });
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

    const clinics = clinicsOf(sites);
    for (const c of categories) {
      const inC = clinics.filter(inCategory(c.slug));
      if (inC.length === 0) continue;
      out.push({ url: absUrl(paths.clinicCategory(city.slug, c.slug)), lastModified: latest(inC) });
      for (const a of areas) {
        const inCA = inC.filter(siteInArea(a.slug));
        if (inCA.length > 0) out.push({ url: absUrl(paths.clinicCategoryArea(city.slug, c.slug, a.slug)), lastModified: latest(inCA) });
      }
    }

    const hospitals = hospitalsOf(sites);
    if (hospitals.length > 0) {
      out.push({ url: absUrl(paths.hospitals(city.slug)), lastModified: latest(hospitals) });
      for (const a of areas) {
        const inA = hospitals.filter(siteInArea(a.slug));
        if (inA.length > 0) out.push({ url: absUrl(paths.hospitalsArea(city.slug, a.slug)), lastModified: latest(inA) });
      }
    }

    // Area hubs list doctors, clinics and hospitals.
    for (const a of areas) {
      const inA = [...doctors.filter(inArea(a.slug)), ...sites.filter(siteInArea(a.slug))];
      if (inA.length > 0) out.push({ url: absUrl(paths.area(city.slug, a.slug)), lastModified: latest(inA) });
    }
  }
  return out;
}

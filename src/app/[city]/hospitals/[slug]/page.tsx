import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HubPage } from "@/components/public/HubPage";
import { hospitalsOf, hospitalTypeLinks, inArea, inCategory, loadCity, siteAreaLinks, siteInArea, type CityContext } from "@/lib/public/hubs";
import type { AreaMaster } from "@/lib/public/data";
import type { CategoryMaster } from "@/lib/public/establishments";
import { countPhrase, hubMetadata } from "@/lib/seo/hub";
import { absUrl, paths } from "@/lib/site";
import type { SiteCardData } from "@/templates/types";

/**
 * /[city]/hospitals/[slug] is either a hospital type hub ("Maternity Hospitals
 * in Pune", slug = the type's category slug) or an area hub ("Hospitals in
 * Wakad, Pune"). Types are matched first; their slugs end in "-hospital", so
 * they don't clash with area names. Alphabetical; noindex while empty.
 */

export const revalidate = 86400;
export async function generateStaticParams() {
  return [];
}

type Params = { city: string; slug: string };

type Data =
  | { ctx: CityContext; hospitals: SiteCardData[]; type: CategoryMaster; inType: SiteCardData[] }
  | { ctx: CityContext; hospitals: SiteCardData[]; area: AreaMaster; here: SiteCardData[] };

async function load(params: Promise<Params>): Promise<Data | null> {
  const { city, slug } = await params;
  const ctx = await loadCity(city);
  if (!ctx) return null;
  const hospitals = hospitalsOf(ctx.sites);
  const type = ctx.hospitalTypes.find((t) => t.slug === slug);
  if (type) return { ctx, hospitals, type, inType: hospitals.filter(inCategory(type.slug)) };
  const area = ctx.areas.find((a) => a.slug === slug);
  return area ? { ctx, hospitals, area, here: hospitals.filter(siteInArea(area.slug)) } : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const data = await load(params);
  if (!data) return {};
  const city = data.ctx.city;
  if ("type" in data) {
    return hubMetadata({ title: `${data.type.plural} in ${city.name}`, url: absUrl(paths.hospitalType(city.slug, data.type.slug)), count: data.inType.length, place: city.name, listing: "hospitals" });
  }
  const place = `${data.area.name}, ${city.name}`;
  return hubMetadata({ title: `Hospitals in ${place}`, url: absUrl(paths.hospitalsArea(city.slug, data.area.slug)), count: data.here.length, place, listing: "hospitals" });
}

export default async function HospitalsSlugHub({ params }: { params: Promise<Params> }) {
  const data = await load(params);
  if (!data) notFound();
  return "type" in data ? <TypeHub {...data} /> : <AreaHub {...data} />;
}

/** "Maternity Hospitals in Pune". */
function TypeHub({ ctx, hospitals, type, inType }: Extract<Data, { type: CategoryMaster }>) {
  const city = ctx.city;
  const n = inType.length;
  return (
    <HubPage
      title={`${type.plural} in ${city.name}`}
      intro={
        n > 0
          ? `${countPhrase(n, type)} in ${city.name} ${n === 1 ? "has" : "have"} a website on MediReach. Each site shows departments, doctors, facilities, beds, contact numbers and address, as provided by the hospital.`
          : `${type.plural} in ${city.name} will be listed here as they join MediReach.`
      }
      crumbs={[
        { name: "Home", url: absUrl("/") },
        { name: city.name, url: absUrl(paths.city(city.slug)) },
        { name: "Hospitals", url: absUrl(paths.hospitals(city.slug)) },
        { name: type.plural, url: absUrl(paths.hospitalType(city.slug, type.slug)) },
      ]}
      siteLists={[{ title: type.plural, sites: inType }]}
      emptyText="Nothing is listed here yet."
      emptyCta="Run a hospital? Get your website on MediReach"
      linkGroups={[
        { title: `${type.plural} by area`, links: siteAreaLinks(ctx, inType, (a) => absUrl(paths.hospitalTypeArea(city.slug, type.slug, a.slug))) },
        { title: "Other types of hospital", links: hospitalTypeLinks(ctx, hospitals, (t) => absUrl(paths.hospitalType(city.slug, t.slug))).filter((l) => l.name !== type.plural) },
        { title: `All hospitals in ${city.name}`, links: hospitals.length ? [{ name: "Hospitals", url: absUrl(paths.hospitals(city.slug)), count: hospitals.length }] : [] },
      ]}
    />
  );
}

/** "Hospitals in Wakad, Pune". */
function AreaHub({ ctx, hospitals, area, here }: Extract<Data, { area: AreaMaster }>) {
  const city = ctx.city;
  const place = `${area.name}, ${city.name}`;
  const n = here.length;
  const everythingHere = ctx.doctors.filter(inArea(area.slug)).length + ctx.sites.filter(siteInArea(area.slug)).length;
  return (
    <HubPage
      title={`Hospitals in ${place}`}
      intro={
        n > 0
          ? `${n === 1 ? "1 hospital" : `${n} hospitals`} in ${place} ${n === 1 ? "has" : "have"} a website on MediReach, with departments, doctors, facilities, beds and contact numbers.`
          : `Hospitals in ${place} will be listed here as they join MediReach.`
      }
      crumbs={[
        { name: "Home", url: absUrl("/") },
        { name: city.name, url: absUrl(paths.city(city.slug)) },
        { name: "Hospitals", url: absUrl(paths.hospitals(city.slug)) },
        { name: area.name, url: absUrl(paths.hospitalsArea(city.slug, area.slug)) },
      ]}
      siteLists={[{ title: "Hospitals", sites: here }]}
      emptyText="No hospitals in this area are listed here yet."
      emptyCta="Run a hospital? Get your website on MediReach"
      linkGroups={[
        {
          title: `Types of hospital in ${area.name}`,
          links: hospitalTypeLinks(ctx, here, (t) => absUrl(paths.hospitalTypeArea(city.slug, t.slug, area.slug))),
        },
        {
          title: "Hospitals in other areas",
          links: siteAreaLinks(ctx, hospitals, (a) => absUrl(paths.hospitalsArea(city.slug, a.slug))).filter((l) => l.name !== area.name),
        },
        {
          title: `Everything in ${area.name}`,
          links: everythingHere ? [{ name: `Doctors, clinics and hospitals in ${area.name}`, url: absUrl(paths.area(city.slug, area.slug)), count: everythingHere }] : [],
        },
      ]}
    />
  );
}

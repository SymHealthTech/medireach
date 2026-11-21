import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HubPage } from "@/components/public/HubPage";
import { hospitalsOf, hospitalTypeLinks, inArea, inCategory, loadCity, siteAreaLinks, siteInArea } from "@/lib/public/hubs";
import { countPhrase, hubMetadata } from "@/lib/seo/hub";
import { absUrl, paths } from "@/lib/site";

/** Hospital type + area hub: /[city]/hospitals/[type]/[area], e.g. "Maternity Hospitals in Baner, Pune". */

export const revalidate = 86400;
export async function generateStaticParams() {
  return [];
}

type Params = { city: string; slug: string; area: string };

async function load(params: Promise<Params>) {
  const { city, slug, area } = await params;
  const ctx = await loadCity(city);
  const type = ctx?.hospitalTypes.find((t) => t.slug === slug);
  const ar = ctx?.areas.find((a) => a.slug === area);
  if (!ctx || !type || !ar) return null;
  const hospitals = hospitalsOf(ctx.sites);
  const inType = hospitals.filter(inCategory(type.slug));
  return { ctx, type, area: ar, hospitals, inType, here: inType.filter(siteInArea(ar.slug)) };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const data = await load(params);
  if (!data) return {};
  const place = `${data.area.name}, ${data.ctx.city.name}`;
  return hubMetadata({
    title: `${data.type.plural} in ${place}`,
    url: absUrl(paths.hospitalTypeArea(data.ctx.city.slug, data.type.slug, data.area.slug)),
    count: data.here.length,
    place,
    listing: "hospitals",
  });
}

export default async function HospitalTypeAreaHub({ params }: { params: Promise<Params> }) {
  const data = await load(params);
  if (!data) notFound();
  const { ctx, type, area, hospitals, inType, here } = data;
  const city = ctx.city;
  const place = `${area.name}, ${city.name}`;
  const everythingHere = ctx.doctors.filter(inArea(area.slug)).length + ctx.sites.filter(siteInArea(area.slug)).length;

  return (
    <HubPage
      title={`${type.plural} in ${place}`}
      intro={
        here.length > 0
          ? `${countPhrase(here.length, type)} in ${place} ${here.length === 1 ? "has" : "have"} a website on MediReach, with departments, doctors, facilities, beds and contact numbers.`
          : `${type.plural} in ${place} will be listed here as they join MediReach.`
      }
      crumbs={[
        { name: "Home", url: absUrl("/") },
        { name: city.name, url: absUrl(paths.city(city.slug)) },
        { name: "Hospitals", url: absUrl(paths.hospitals(city.slug)) },
        { name: type.plural, url: absUrl(paths.hospitalType(city.slug, type.slug)) },
        { name: area.name, url: absUrl(paths.hospitalTypeArea(city.slug, type.slug, area.slug)) },
      ]}
      siteLists={[{ title: type.plural, sites: here }]}
      emptyText="Nothing is listed here yet."
      emptyCta="Run a hospital? Get your website on MediReach"
      linkGroups={[
        {
          title: `${type.plural} in other areas`,
          links: siteAreaLinks(ctx, inType, (a) => absUrl(paths.hospitalTypeArea(city.slug, type.slug, a.slug))).filter((l) => l.name !== area.name),
        },
        {
          title: `Other hospitals in ${area.name}`,
          links: hospitalTypeLinks(ctx, hospitals.filter(siteInArea(area.slug)), (t) => absUrl(paths.hospitalTypeArea(city.slug, t.slug, area.slug))).filter((l) => l.name !== type.plural),
        },
        {
          title: `Everything in ${area.name}`,
          links: everythingHere ? [{ name: `Doctors, clinics and hospitals in ${area.name}`, url: absUrl(paths.area(city.slug, area.slug)), count: everythingHere }] : [],
        },
      ]}
    />
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HubPage } from "@/components/public/HubPage";
import { hospitalsOf, inArea, loadCity, siteAreaLinks, siteInArea } from "@/lib/public/hubs";
import { hubMetadata } from "@/lib/seo/hub";
import { absUrl, paths } from "@/lib/site";

/** Hospitals in an area: /[city]/hospitals/[area], e.g. "Hospitals in Wakad, Pune". */

export const revalidate = 86400;
export async function generateStaticParams() {
  return [];
}

type Params = { city: string; area: string };

async function load(params: Promise<Params>) {
  const { city, area } = await params;
  const ctx = await loadCity(city);
  const ar = ctx?.areas.find((a) => a.slug === area);
  if (!ctx || !ar) return null;
  const hospitals = hospitalsOf(ctx.sites);
  return { ctx, area: ar, hospitals, here: hospitals.filter(siteInArea(ar.slug)) };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const data = await load(params);
  if (!data) return {};
  const place = `${data.area.name}, ${data.ctx.city.name}`;
  return hubMetadata({
    title: `Hospitals in ${place}`,
    url: absUrl(paths.hospitalsArea(data.ctx.city.slug, data.area.slug)),
    count: data.here.length,
    place,
    listing: "hospitals",
  });
}

export default async function HospitalsAreaHub({ params }: { params: Promise<Params> }) {
  const data = await load(params);
  if (!data) notFound();
  const { ctx, area, hospitals, here } = data;
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

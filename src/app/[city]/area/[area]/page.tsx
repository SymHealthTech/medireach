import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HubPage } from "@/components/public/HubPage";
import { allAreaLinks, categoryLinks, clinicsOf, hospitalsOf, inArea, loadCity, siteInArea, specialtyLinks } from "@/lib/public/hubs";
import { hubMetadata, listedKinds } from "@/lib/seo/hub";
import { absUrl, paths } from "@/lib/site";

/**
 * Area hub: /[city]/area/[area]: doctors, clinics and hospitals in the area,
 * e.g. "Doctors in Kothrud, Pune" or "Doctors, clinics and hospitals in Baner,
 * Pune" (the title names only what is actually listed).
 */

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
  const sitesHere = ctx.sites.filter(siteInArea(ar.slug));
  const doctors = ctx.doctors.filter(inArea(ar.slug));
  const clinics = clinicsOf(sitesHere);
  const hospitals = hospitalsOf(sitesHere);
  const place = `${ar.name}, ${ctx.city.name}`;
  const title = `${listedKinds({ doctors: doctors.length, clinics: clinics.length, hospitals: hospitals.length })} in ${place}`;
  return { ctx, area: ar, doctors, clinics, hospitals, place, title };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const data = await load(params);
  if (!data) return {};
  const sites = data.clinics.length + data.hospitals.length;
  return hubMetadata({
    title: data.title,
    url: absUrl(paths.area(data.ctx.city.slug, data.area.slug)),
    count: data.doctors.length + sites,
    place: data.place,
    listing: sites ? "places" : "doctors",
  });
}

export default async function AreaHub({ params }: { params: Promise<Params> }) {
  const data = await load(params);
  if (!data) notFound();
  const { ctx, area, doctors, clinics, hospitals, place, title } = data;
  const city = ctx.city;
  const hasSites = clinics.length + hospitals.length > 0;
  const parts = [
    doctors.length ? (doctors.length === 1 ? "1 doctor" : `${doctors.length} doctors`) : "",
    clinics.length ? (clinics.length === 1 ? "1 clinic" : `${clinics.length} clinics`) : "",
    hospitals.length ? (hospitals.length === 1 ? "1 hospital" : `${hospitals.length} hospitals`) : "",
  ].filter(Boolean);
  const total = doctors.length + clinics.length + hospitals.length;

  return (
    <HubPage
      title={title}
      intro={
        total > 0
          ? `${parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0]} in ${place} ${total === 1 ? "has" : "have"} a page on MediReach, with timings, address and contact details as provided by them.`
          : `Doctors, clinics and hospitals in ${place} will be listed here as they join MediReach.`
      }
      crumbs={[
        { name: "Home", url: absUrl("/") },
        { name: city.name, url: absUrl(paths.city(city.slug)) },
        { name: area.name, url: absUrl(paths.area(city.slug, area.slug)) },
      ]}
      doctors={doctors}
      {...(hasSites ? { doctorsTitle: "Doctors" } : {})}
      siteLists={[
        { title: "Clinics", sites: clinics },
        { title: "Hospitals", sites: hospitals },
      ]}
      emptyText="Nothing is listed here yet."
      linkGroups={[
        {
          title: `Specialties in ${area.name}`,
          links: specialtyLinks(ctx, doctors, (s) => absUrl(paths.specialtyArea(city.slug, s.slug, area.slug))),
        },
        {
          title: `Clinics in ${area.name}`,
          links: categoryLinks(ctx, clinics, (c) => absUrl(paths.clinicCategoryArea(city.slug, c.slug, area.slug))),
        },
        {
          title: `Hospitals in ${area.name}`,
          links: hospitals.length ? [{ name: `Hospitals in ${area.name}`, url: absUrl(paths.hospitalsArea(city.slug, area.slug)), count: hospitals.length }] : [],
        },
        {
          title: `Other areas in ${city.name}`,
          links: allAreaLinks(ctx, (a) => absUrl(paths.area(city.slug, a.slug))).filter((l) => l.name !== area.name),
        },
      ]}
    />
  );
}

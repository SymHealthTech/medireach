import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HubPage } from "@/components/public/HubPage";
import { categoryLinks, clinicsOf, hospitalsOf, hospitalTypeLinks, loadCity, siteAreaLinks } from "@/lib/public/hubs";
import { hubMetadata } from "@/lib/seo/hub";
import { absUrl, paths } from "@/lib/site";

/** Hospital hub: /[city]/hospitals, e.g. "Hospitals in Pune". Alphabetical; noindex while empty. */

export const revalidate = 86400;
export async function generateStaticParams() {
  return [];
}

type Params = { city: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const ctx = await loadCity((await params).city);
  if (!ctx) return {};
  return hubMetadata({
    title: `Hospitals in ${ctx.city.name}`,
    url: absUrl(paths.hospitals(ctx.city.slug)),
    count: hospitalsOf(ctx.sites).length,
    place: ctx.city.name,
    listing: "hospitals",
  });
}

export default async function HospitalsHub({ params }: { params: Promise<Params> }) {
  const ctx = await loadCity((await params).city);
  if (!ctx) notFound();
  const city = ctx.city;
  const hospitals = hospitalsOf(ctx.sites);
  const n = hospitals.length;

  return (
    <HubPage
      title={`Hospitals in ${city.name}`}
      intro={
        n > 0
          ? `${n === 1 ? "1 hospital" : `${n} hospitals`} in ${city.name} ${n === 1 ? "has" : "have"} a website on MediReach. Each site shows departments, doctors, facilities, beds, contact numbers and address, as provided by the hospital.`
          : `Hospitals in ${city.name} will be listed here as they join MediReach.`
      }
      crumbs={[
        { name: "Home", url: absUrl("/") },
        { name: city.name, url: absUrl(paths.city(city.slug)) },
        { name: "Hospitals", url: absUrl(paths.hospitals(city.slug)) },
      ]}
      siteLists={[{ title: "Hospitals", sites: hospitals }]}
      emptyText="No hospitals are listed here yet."
      emptyCta="Run a hospital? Get your website on MediReach"
      linkGroups={[
        { title: "Hospitals by type", links: hospitalTypeLinks(ctx, hospitals, (t) => absUrl(paths.hospitalType(city.slug, t.slug))) },
        { title: "Hospitals by area", links: siteAreaLinks(ctx, hospitals, (a) => absUrl(paths.hospitalsArea(city.slug, a.slug))) },
        { title: `Clinics in ${city.name}`, links: categoryLinks(ctx, clinicsOf(ctx.sites), (c) => absUrl(paths.clinicCategory(city.slug, c.slug))) },
      ]}
    />
  );
}

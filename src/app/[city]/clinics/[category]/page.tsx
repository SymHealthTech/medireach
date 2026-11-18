import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HubPage } from "@/components/public/HubPage";
import { categoryLinks, clinicsOf, hospitalsOf, inCategory, loadCity, siteAreaLinks } from "@/lib/public/hubs";
import { countPhrase, hubMetadata } from "@/lib/seo/hub";
import { absUrl, paths } from "@/lib/site";

/** Clinic category hub: /[city]/clinics/[category], e.g. "Skin Clinics in Pune". Alphabetical; noindex while empty. */

export const revalidate = 86400;
export async function generateStaticParams() {
  return [];
}

type Params = { city: string; category: string };

async function load(params: Promise<Params>) {
  const { city, category } = await params;
  const ctx = await loadCity(city);
  const cat = ctx?.categories.find((c) => c.slug === category);
  if (!ctx || !cat) return null;
  const clinics = clinicsOf(ctx.sites);
  return { ctx, cat, clinics, inCat: clinics.filter(inCategory(cat.slug)) };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const data = await load(params);
  if (!data) return {};
  return hubMetadata({
    title: `${data.cat.plural} in ${data.ctx.city.name}`,
    url: absUrl(paths.clinicCategory(data.ctx.city.slug, data.cat.slug)),
    count: data.inCat.length,
    place: data.ctx.city.name,
    listing: "clinics",
  });
}

export default async function ClinicCategoryHub({ params }: { params: Promise<Params> }) {
  const data = await load(params);
  if (!data) notFound();
  const { ctx, cat, clinics, inCat } = data;
  const city = ctx.city;
  const hospitals = hospitalsOf(ctx.sites);

  return (
    <HubPage
      title={`${cat.plural} in ${city.name}`}
      intro={
        inCat.length > 0
          ? `${countPhrase(inCat.length, cat)} in ${city.name} ${inCat.length === 1 ? "has" : "have"} a website on MediReach. Each site shows services, doctors, timings, address and contact details, as provided by the clinic.`
          : `${cat.plural} in ${city.name} will be listed here as they join MediReach.`
      }
      crumbs={[
        { name: "Home", url: absUrl("/") },
        { name: city.name, url: absUrl(paths.city(city.slug)) },
        { name: cat.plural, url: absUrl(paths.clinicCategory(city.slug, cat.slug)) },
      ]}
      siteLists={[{ title: cat.plural, sites: inCat }]}
      emptyText={`Nothing is listed here yet.`}
      emptyCta="Run a clinic? Get your website on MediReach"
      linkGroups={[
        { title: `${cat.plural} by area`, links: siteAreaLinks(ctx, inCat, (a) => absUrl(paths.clinicCategoryArea(city.slug, cat.slug, a.slug))) },
        {
          title: `Other clinics in ${city.name}`,
          links: categoryLinks(ctx, clinics, (c) => absUrl(paths.clinicCategory(city.slug, c.slug))).filter((l) => l.name !== cat.plural),
        },
        {
          title: `Hospitals in ${city.name}`,
          links: hospitals.length ? [{ name: "Hospitals", url: absUrl(paths.hospitals(city.slug)), count: hospitals.length }] : [],
        },
      ]}
    />
  );
}

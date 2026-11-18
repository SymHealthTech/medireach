import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HubPage } from "@/components/public/HubPage";
import { categoryLinks, clinicsOf, inArea, inCategory, loadCity, siteAreaLinks, siteInArea } from "@/lib/public/hubs";
import { countPhrase, hubMetadata } from "@/lib/seo/hub";
import { absUrl, paths } from "@/lib/site";

/** Clinic category + area hub: /[city]/clinics/[category]/[area], e.g. "Skin Clinics in Baner, Pune". */

export const revalidate = 86400;
export async function generateStaticParams() {
  return [];
}

type Params = { city: string; category: string; area: string };

async function load(params: Promise<Params>) {
  const { city, category, area } = await params;
  const ctx = await loadCity(city);
  const cat = ctx?.categories.find((c) => c.slug === category);
  const ar = ctx?.areas.find((a) => a.slug === area);
  if (!ctx || !cat || !ar) return null;
  const clinics = clinicsOf(ctx.sites);
  const inCat = clinics.filter(inCategory(cat.slug));
  return { ctx, cat, area: ar, clinics, inCat, here: inCat.filter(siteInArea(ar.slug)) };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const data = await load(params);
  if (!data) return {};
  const place = `${data.area.name}, ${data.ctx.city.name}`;
  return hubMetadata({
    title: `${data.cat.plural} in ${place}`,
    url: absUrl(paths.clinicCategoryArea(data.ctx.city.slug, data.cat.slug, data.area.slug)),
    count: data.here.length,
    place,
    listing: "clinics",
  });
}

export default async function ClinicCategoryAreaHub({ params }: { params: Promise<Params> }) {
  const data = await load(params);
  if (!data) notFound();
  const { ctx, cat, area, clinics, inCat, here } = data;
  const city = ctx.city;
  const place = `${area.name}, ${city.name}`;
  const everythingHere = ctx.doctors.filter(inArea(area.slug)).length + ctx.sites.filter(siteInArea(area.slug)).length;

  return (
    <HubPage
      title={`${cat.plural} in ${place}`}
      intro={
        here.length > 0
          ? `${countPhrase(here.length, cat)} in ${place} ${here.length === 1 ? "has" : "have"} a website on MediReach, with services, doctors, timings, address and contact details.`
          : `${cat.plural} in ${place} will be listed here as they join MediReach.`
      }
      crumbs={[
        { name: "Home", url: absUrl("/") },
        { name: city.name, url: absUrl(paths.city(city.slug)) },
        { name: cat.plural, url: absUrl(paths.clinicCategory(city.slug, cat.slug)) },
        { name: area.name, url: absUrl(paths.clinicCategoryArea(city.slug, cat.slug, area.slug)) },
      ]}
      siteLists={[{ title: cat.plural, sites: here }]}
      emptyText="Nothing is listed here yet."
      emptyCta="Run a clinic? Get your website on MediReach"
      linkGroups={[
        {
          title: `${cat.plural} in other areas`,
          links: siteAreaLinks(ctx, inCat, (a) => absUrl(paths.clinicCategoryArea(city.slug, cat.slug, a.slug))).filter((l) => l.name !== area.name),
        },
        {
          title: `Other clinics in ${area.name}`,
          links: categoryLinks(ctx, clinics.filter(siteInArea(area.slug)), (c) => absUrl(paths.clinicCategoryArea(city.slug, c.slug, area.slug))).filter(
            (l) => l.name !== cat.plural,
          ),
        },
        {
          title: `Everything in ${area.name}`,
          links: everythingHere ? [{ name: `Doctors, clinics and hospitals in ${area.name}`, url: absUrl(paths.area(city.slug, area.slug)), count: everythingHere }] : [],
        },
      ]}
    />
  );
}

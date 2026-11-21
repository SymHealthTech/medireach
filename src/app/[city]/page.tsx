import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HubPage } from "@/components/public/HubPage";
import { allAreaLinks, categoryLinks, clinicsOf, hospitalsOf, hospitalTypeLinks, loadCity, specialtyLinks, type CityContext } from "@/lib/public/hubs";
import { doctorsCount, hubMetadata, listedKinds } from "@/lib/seo/hub";
import { listJoin } from "@/lib/seo/profile";
import { absUrl, paths } from "@/lib/site";

/**
 * City hub: /[city]. Links to every specialty and area with published doctors,
 * every clinic category with published clinics, and the hospitals hub.
 * (Top-level "dr-…" short links never reach here; next.config rewrites them
 * to /go/[shortSlug].)
 */

export const revalidate = 86400;
export async function generateStaticParams() {
  return [];
}

type Params = { city: string };

function titleOf(ctx: CityContext): string {
  const kinds = listedKinds({ doctors: ctx.doctors.length, clinics: clinicsOf(ctx.sites).length, hospitals: hospitalsOf(ctx.sites).length });
  return `${kinds} in ${ctx.city.name}`;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const ctx = await loadCity((await params).city);
  if (!ctx) return {};
  return hubMetadata({
    title: titleOf(ctx),
    url: absUrl(paths.city(ctx.city.slug)),
    count: ctx.doctors.length + ctx.sites.length,
    place: ctx.city.name,
    listing: ctx.sites.length ? "places" : "doctors",
  });
}

export default async function CityHub({ params }: { params: Promise<Params> }) {
  const ctx = await loadCity((await params).city);
  if (!ctx) notFound();
  const { city, doctors } = ctx;
  const clinics = clinicsOf(ctx.sites);
  const hospitals = hospitalsOf(ctx.sites);

  return (
    <HubPage
      title={titleOf(ctx)}
      intro={
        doctors.length + ctx.sites.length > 0
          ? `${listJoin([doctors.length ? doctorsCount(doctors.length) : "", clinics.length ? `${clinics.length} ${clinics.length === 1 ? "clinic" : "clinics"}` : "", hospitals.length ? `${hospitals.length} ${hospitals.length === 1 ? "hospital" : "hospitals"}` : ""].filter(Boolean))} in ${city.name} ${doctors.length + ctx.sites.length === 1 ? "has" : "have"} a page on MediReach. Browse by specialty, type of clinic or area to see timings, address and contact details, as provided by them.`
          : `Doctors, clinics and hospitals in ${city.name} will be listed here as they join MediReach.`
      }
      crumbs={[
        { name: "Home", url: absUrl("/") },
        { name: city.name, url: absUrl(paths.city(city.slug)) },
      ]}
      linkGroups={[
        { title: `Doctors by specialty in ${city.name}`, links: specialtyLinks(ctx, doctors, (s) => absUrl(paths.specialty(city.slug, s.slug))) },
        { title: `Clinics in ${city.name}`, links: categoryLinks(ctx, clinics, (c) => absUrl(paths.clinicCategory(city.slug, c.slug))) },
        {
          title: `Hospitals in ${city.name}`,
          links: hospitals.length
            ? [
                { name: "All hospitals", url: absUrl(paths.hospitals(city.slug)), count: hospitals.length },
                ...hospitalTypeLinks(ctx, hospitals, (t) => absUrl(paths.hospitalType(city.slug, t.slug))),
              ]
            : [],
        },
        { title: `Areas in ${city.name}`, links: allAreaLinks(ctx, (a) => absUrl(paths.area(city.slug, a.slug))) },
      ]}
    />
  );
}

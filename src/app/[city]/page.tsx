import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HubPage } from "@/components/public/HubPage";
import { areaLinks, loadCity, specialtyLinks } from "@/lib/public/hubs";
import { doctorsCount, hubMetadata } from "@/lib/seo/hub";
import { absUrl, paths } from "@/lib/site";

/**
 * City hub: /[city]. Links to every specialty and area that has published
 * doctors. (Top-level "dr-…" short links never reach here; next.config
 * rewrites them to /go/[shortSlug].)
 */

export const revalidate = 86400;
export async function generateStaticParams() {
  return [];
}

type Params = { city: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const ctx = await loadCity((await params).city);
  if (!ctx) return {};
  return hubMetadata({
    title: `Doctors in ${ctx.city.name}`,
    url: absUrl(paths.city(ctx.city.slug)),
    count: ctx.doctors.length,
    place: ctx.city.name,
  });
}

export default async function CityHub({ params }: { params: Promise<Params> }) {
  const ctx = await loadCity((await params).city);
  if (!ctx) notFound();
  const { city, doctors } = ctx;

  return (
    <HubPage
      title={`Doctors in ${city.name}`}
      intro={
        doctors.length > 0
          ? `${doctorsCount(doctors.length)} in ${city.name} have a page on MediReach. Browse by specialty or area to see each doctor's qualifications, registration, clinic timings, address and contact details, as provided by the doctor.`
          : `Doctors in ${city.name} will be listed here as they join MediReach.`
      }
      crumbs={[
        { name: "Home", url: absUrl("/") },
        { name: city.name, url: absUrl(paths.city(city.slug)) },
      ]}
      linkGroups={[
        { title: `Specialties in ${city.name}`, links: specialtyLinks(ctx, doctors, (s) => absUrl(paths.specialty(city.slug, s.slug))) },
        { title: `Areas in ${city.name}`, links: areaLinks(ctx, doctors, (a) => absUrl(paths.area(city.slug, a.slug))) },
      ]}
    />
  );
}

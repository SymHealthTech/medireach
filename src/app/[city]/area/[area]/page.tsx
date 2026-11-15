import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HubPage } from "@/components/public/HubPage";
import { areaLinks, inArea, loadCity, specialtyLinks } from "@/lib/public/hubs";
import { doctorsCount, hubMetadata } from "@/lib/seo/hub";
import { absUrl, paths } from "@/lib/site";

/** Area hub: /[city]/area/[area], e.g. "Doctors in Kothrud, Pune". */

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
  return { ctx, area: ar, doctors: ctx.doctors.filter(inArea(ar.slug)) };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const data = await load(params);
  if (!data) return {};
  const place = `${data.area.name}, ${data.ctx.city.name}`;
  return hubMetadata({
    title: `Doctors in ${place}`,
    url: absUrl(paths.area(data.ctx.city.slug, data.area.slug)),
    count: data.doctors.length,
    place,
  });
}

export default async function AreaHub({ params }: { params: Promise<Params> }) {
  const data = await load(params);
  if (!data) notFound();
  const { ctx, area, doctors } = data;
  const city = ctx.city;
  const place = `${area.name}, ${city.name}`;

  return (
    <HubPage
      title={`Doctors in ${place}`}
      intro={
        doctors.length > 0
          ? `${doctorsCount(doctors.length)} in ${place} have a page on MediReach. Each page shows qualifications, registration, clinic timings, address and contact details, as provided by the doctor.`
          : `Doctors in ${place} will be listed here as they join MediReach.`
      }
      crumbs={[
        { name: "Home", url: absUrl("/") },
        { name: city.name, url: absUrl(paths.city(city.slug)) },
        { name: area.name, url: absUrl(paths.area(city.slug, area.slug)) },
      ]}
      doctors={doctors}
      linkGroups={[
        {
          title: `Specialties in ${area.name}`,
          links: specialtyLinks(ctx, doctors, (s) => absUrl(paths.specialtyArea(city.slug, s.slug, area.slug))),
        },
        {
          title: `Other areas in ${city.name}`,
          links: areaLinks(ctx, ctx.doctors, (a) => absUrl(paths.area(city.slug, a.slug))).filter((l) => l.name !== area.name),
        },
      ]}
    />
  );
}

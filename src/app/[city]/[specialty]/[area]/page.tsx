import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HubPage } from "@/components/public/HubPage";
import { areaLinks, inArea, inSpecialty, loadCity, specialtyLinks } from "@/lib/public/hubs";
import { hubMetadata, listedAs } from "@/lib/seo/hub";
import { absUrl, paths } from "@/lib/site";

/** Specialty + area hub: /[city]/[specialty]/[area], e.g. "General Physicians in Kothrud, Pune". */

export const revalidate = 86400;
export async function generateStaticParams() {
  return [];
}

type Params = { city: string; specialty: string; area: string };

async function load(params: Promise<Params>) {
  const { city, specialty, area } = await params;
  const ctx = await loadCity(city);
  const spec = ctx?.specialties.find((s) => s.slug === specialty);
  const ar = ctx?.areas.find((a) => a.slug === area);
  if (!ctx || !spec || !ar) return null;
  return { ctx, spec, area: ar, doctors: ctx.doctors.filter(inSpecialty(spec.slug)).filter(inArea(ar.slug)) };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const data = await load(params);
  if (!data) return {};
  const place = `${data.area.name}, ${data.ctx.city.name}`;
  return hubMetadata({
    title: `${data.spec.plural} in ${place}`,
    url: absUrl(paths.specialtyArea(data.ctx.city.slug, data.spec.slug, data.area.slug)),
    count: data.doctors.length,
    place,
  });
}

export default async function SpecialtyAreaHub({ params }: { params: Promise<Params> }) {
  const data = await load(params);
  if (!data) notFound();
  const { ctx, spec, area, doctors } = data;
  const city = ctx.city;
  const place = `${area.name}, ${city.name}`;
  const inThisSpecialty = ctx.doctors.filter(inSpecialty(spec.slug));
  const inThisArea = ctx.doctors.filter(inArea(area.slug));

  return (
    <HubPage
      title={`${spec.plural} in ${place}`}
      intro={
        doctors.length > 0
          ? `${listedAs(doctors.length, spec)} in ${place}. Each page shows qualifications, registration, clinic timings, address and contact details, as provided by the doctor.`
          : `${spec.plural} in ${place} will be listed here as they join MediReach.`
      }
      crumbs={[
        { name: "Home", url: absUrl("/") },
        { name: city.name, url: absUrl(paths.city(city.slug)) },
        { name: spec.plural, url: absUrl(paths.specialty(city.slug, spec.slug)) },
        { name: area.name, url: absUrl(paths.specialtyArea(city.slug, spec.slug, area.slug)) },
      ]}
      doctors={doctors}
      linkGroups={[
        {
          title: `${spec.plural} in nearby areas of ${city.name}`,
          links: areaLinks(ctx, inThisSpecialty, (a) => absUrl(paths.specialtyArea(city.slug, spec.slug, a.slug))).filter(
            (l) => l.name !== area.name,
          ),
        },
        {
          title: `Other specialties in ${area.name}`,
          links: specialtyLinks(ctx, inThisArea, (s) => absUrl(paths.specialtyArea(city.slug, s.slug, area.slug))).filter(
            (l) => l.name !== spec.plural,
          ),
        },
      ]}
    />
  );
}

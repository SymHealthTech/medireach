import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HubPage } from "@/components/public/HubPage";
import { areaLinks, inSpecialty, loadCity, specialtyLinks } from "@/lib/public/hubs";
import { hubMetadata, listedAs } from "@/lib/seo/hub";
import { absUrl, paths } from "@/lib/site";

/** Specialty hub: /[city]/[specialty], e.g. "General Physicians in Pune". */

export const revalidate = 86400;
export async function generateStaticParams() {
  return [];
}

type Params = { city: string; specialty: string };

async function load(params: Promise<Params>) {
  const { city, specialty } = await params;
  const ctx = await loadCity(city);
  const spec = ctx?.specialties.find((s) => s.slug === specialty);
  if (!ctx || !spec) return null;
  return { ctx, spec, doctors: ctx.doctors.filter(inSpecialty(spec.slug)) };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const data = await load(params);
  if (!data) return {};
  return hubMetadata({
    title: `${data.spec.plural} in ${data.ctx.city.name}`,
    url: absUrl(paths.specialty(data.ctx.city.slug, data.spec.slug)),
    count: data.doctors.length,
    place: data.ctx.city.name,
  });
}

export default async function SpecialtyHub({ params }: { params: Promise<Params> }) {
  const data = await load(params);
  if (!data) notFound();
  const { ctx, spec, doctors } = data;
  const city = ctx.city;

  return (
    <HubPage
      title={`${spec.plural} in ${city.name}`}
      intro={
        doctors.length > 0
          ? `${listedAs(doctors.length, spec)} in ${city.name}. Each page shows qualifications, registration, clinic timings, address and contact details, as provided by the doctor.`
          : `${spec.plural} in ${city.name} will be listed here as they join MediReach.`
      }
      crumbs={[
        { name: "Home", url: absUrl("/") },
        { name: city.name, url: absUrl(paths.city(city.slug)) },
        { name: spec.plural, url: absUrl(paths.specialty(city.slug, spec.slug)) },
      ]}
      doctors={doctors}
      linkGroups={[
        {
          title: `${spec.plural} by area`,
          links: areaLinks(ctx, doctors, (a) => absUrl(paths.specialtyArea(city.slug, spec.slug, a.slug))),
        },
        {
          title: `Other specialties in ${city.name}`,
          links: specialtyLinks(ctx, ctx.doctors, (s) => absUrl(paths.specialty(city.slug, s.slug))).filter(
            (l) => l.name !== spec.plural,
          ),
        },
      ]}
    />
  );
}

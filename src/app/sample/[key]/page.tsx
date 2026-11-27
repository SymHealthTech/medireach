import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProfileView } from "@/components/public/ProfileView";
import { DesignSwitcher } from "@/components/public/DesignSwitcher";
import { SAMPLE_DESIGNS } from "@/lib/sample-designs";
import { SAMPLE_KEYS, SAMPLE_PUBLIC_DOCTORS } from "@/fixtures/sample-public";

/**
 * Public sample pages (/sample/gp, /sample/consultant) linked from the
 * homepage. Fictional doctors rendered with the real templates; `?design=t2`
 * picks a design. The floating switcher opens each design with its own demo
 * doctor (SAMPLE_DESIGNS[].sample), so the five demos show five doctors.
 * noindex, clearly labelled, and without the doctor JSON-LD.
 */
export function generateStaticParams() {
  return SAMPLE_KEYS.map((key) => ({ key }));
}

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const { key } = await params;
  const d = SAMPLE_PUBLIC_DOCTORS[key];
  const demo = d?.id.startsWith("demo-");
  const place = d?.clinics[0] ? `${d.clinics[0].area.name}, ${d.clinics[0].city.name}` : "";
  return {
    title: { absolute: d && demo ? `${d.fullName} – ${d.primarySpecialty?.name ?? "Doctor"} in ${place} (demo website)` : "Sample doctor page – MediReach" },
    description: d && demo ? `${d.shortBio ?? ""} A MediReach demo website for a fictional doctor.`.trim() : "An example MediReach page for a made-up doctor.",
    robots: { index: false, follow: true },
  };
}

export default async function SamplePage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ design?: string }>;
}) {
  const [{ key }, { design }] = await Promise.all([params, searchParams]);
  const doctor = SAMPLE_PUBLIC_DOCTORS[key as keyof typeof SAMPLE_PUBLIC_DOCTORS];
  if (!doctor) notFound();
  // ?design= wins; otherwise the doctor's own design (demo doctors have one), else Classic.
  const current =
    SAMPLE_DESIGNS.find((d) => d.key === design && d.ready) ??
    SAMPLE_DESIGNS.find((d) => d.key === doctor.portfolioTemplateId && d.ready) ??
    SAMPLE_DESIGNS[0]!;
  const demo = doctor.id.startsWith("demo-");
  // Each design has its own demo doctor: a demo doctor asked for in another
  // design opens that design's own doctor instead (old ?design= links).
  if (demo && current.key !== doctor.portfolioTemplateId && current.sample !== key) redirect(`/sample/${current.sample}?design=${current.key}`);

  return (
    <>
      <div className="bg-marigold px-4 py-2 text-center text-sm font-semibold text-white">
        {demo ? `Demo website — ${doctor.fullName} and the clinic are fictional.` : "Sample page — this doctor and clinic are made up."}{" "}
        <Link href="/" className="underline">
          {demo ? "Get a website like this" : "Get your own page"}
        </Link>
      </div>
      <ProfileView doctor={{ ...doctor, portfolioTemplateId: current.key }} jsonLd={false} />
      <DesignSwitcher current={current.key} />
    </>
  );
}

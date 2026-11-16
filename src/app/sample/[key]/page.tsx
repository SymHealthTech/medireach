import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProfileView } from "@/components/public/ProfileView";
import { DesignSwitcher } from "@/components/public/DesignSwitcher";
import { SAMPLE_DESIGNS } from "@/lib/sample-designs";
import { SAMPLE_PUBLIC_DOCTORS } from "@/fixtures/sample-public";

/**
 * Public sample pages (/sample/gp, /sample/consultant) linked from the
 * homepage. Fictional doctors rendered with the real templates; `?design=t2`
 * picks a design, and the floating switcher flips between them in one click.
 * noindex, clearly labelled, and without the doctor JSON-LD.
 */
export function generateStaticParams() {
  return [{ key: "gp" }, { key: "consultant" }];
}

export const metadata: Metadata = {
  title: { absolute: "Sample doctor page – MediReach" },
  description: "An example MediReach page for a made-up doctor.",
  robots: { index: false, follow: true },
};

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
  const current = SAMPLE_DESIGNS.find((d) => d.key === design && d.ready) ?? SAMPLE_DESIGNS[0]!;

  return (
    <>
      <div className="bg-marigold px-4 py-2 text-center text-sm font-semibold text-[#0e3b3c]">
        Sample page — this doctor and clinic are made up.{" "}
        <Link href="/" className="underline">
          Get your own page
        </Link>
      </div>
      <ProfileView doctor={{ ...doctor, portfolioTemplateId: current.key }} nearby={[]} jsonLd={false} />
      <DesignSwitcher basePath={`/sample/${key}`} current={current.key} />
    </>
  );
}

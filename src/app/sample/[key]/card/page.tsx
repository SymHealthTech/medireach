import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CardPageFooter, CardPageHeader, PatientCardView } from "@/components/cards/DigitalCardPage";
import { SAMPLE_PUBLIC_DOCTORS } from "@/fixtures/sample-public";
import { absUrl } from "@/lib/site";

/**
 * Sample digital visiting card, patient preview (/sample/gp/card): exactly
 * what patients see on a live card page. The navbar toggle switches to the
 * doctor preview (/sample/gp/card/doctor). Fixtures only; noindex.
 */
export function generateStaticParams() {
  return [{ key: "gp" }, { key: "consultant" }];
}

export const metadata: Metadata = {
  title: { absolute: "Sample visiting card – MediReach" },
  description: "An example MediReach digital visiting card for a made-up doctor.",
  robots: { index: false, follow: true },
};

export default async function SampleCardPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const doctor = SAMPLE_PUBLIC_DOCTORS[key as keyof typeof SAMPLE_PUBLIC_DOCTORS];
  if (!doctor) notFound();
  return (
    <div className="flex min-h-dvh flex-col bg-mist">
      <div className="bg-marigold px-4 py-2 text-center text-sm font-semibold text-white">
        Sample card — this doctor and clinic are made up.{" "}
        <Link href="/" className="underline">
          Get your own
        </Link>
      </div>
      <CardPageHeader
        backHref={`/sample/${key}`}
        backLabel="Back"
        toggle={{ current: "patient", patientHref: `/sample/${key}/card`, doctorHref: `/sample/${key}/card/doctor` }}
      />
      <PatientCardView doctor={doctor} websiteUrl={`/sample/${key}`} cardUrl={absUrl(`/sample/${key}/card`)} />
      <CardPageFooter />
    </div>
  );
}

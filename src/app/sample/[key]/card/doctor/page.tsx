import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CardPageFooter, CardPageHeader, DoctorCardView } from "@/components/cards/DigitalCardPage";
import { SAMPLE_KEYS, SAMPLE_PUBLIC_DOCTORS } from "@/fixtures/sample-public";
import { absUrl } from "@/lib/site";

/**
 * Sample digital visiting card, doctor preview (/sample/gp/card/doctor): the
 * card tools a doctor gets after logging in (share link, WhatsApp image,
 * print-ready PDF and PNG, vCard). Fixtures only; noindex.
 */
export function generateStaticParams() {
  return SAMPLE_KEYS.map((key) => ({ key }));
}

export const metadata: Metadata = {
  title: { absolute: "Sample visiting card, doctor view – MediReach" },
  description: "The visiting card tools a MediReach doctor gets after logging in.",
  robots: { index: false, follow: true },
};

export default async function SampleCardDoctorPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const doctor = SAMPLE_PUBLIC_DOCTORS[key as keyof typeof SAMPLE_PUBLIC_DOCTORS];
  if (!doctor) notFound();
  return (
    <div className="min-h-dvh bg-mist">
      <div className="bg-marigold px-4 py-2 text-center text-sm font-semibold text-white">
        Sample — this is what the doctor sees after logging in. Patients only see the card.{" "}
        <Link href="/" className="underline">
          Get your own
        </Link>
      </div>
      <CardPageHeader
        backHref={`/sample/${key}`}
        backLabel="Back"
        toggle={{ current: "doctor", patientHref: `/sample/${key}/card`, doctorHref: `/sample/${key}/card/doctor` }}
      />
      <DoctorCardView
        doctor={doctor}
        websiteUrl={`/sample/${key}`}
        cardUrl={absUrl(`/sample/${key}/card`)}
        filesBase={`/sample/${key}/card`}
        version={doctor.updatedAt}
      />
      <CardPageFooter />
    </div>
  );
}

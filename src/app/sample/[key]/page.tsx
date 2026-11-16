import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProfileView } from "@/components/public/ProfileView";
import { SAMPLE_PUBLIC_DOCTORS } from "@/fixtures/sample-public";

/**
 * Public sample pages (/sample/gp, /sample/consultant) linked from the
 * homepage. Fictional doctors rendered with the real Classic page; noindex,
 * clearly labelled, and without the doctor JSON-LD.
 */
export function generateStaticParams() {
  return [{ key: "gp" }, { key: "consultant" }];
}

export const metadata: Metadata = {
  title: { absolute: "Sample doctor page – MediReach" },
  description: "An example MediReach page for a made-up doctor.",
  robots: { index: false, follow: true },
};

export default async function SamplePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const doctor = SAMPLE_PUBLIC_DOCTORS[key as keyof typeof SAMPLE_PUBLIC_DOCTORS];
  if (!doctor) notFound();
  return (
    <>
      <div className="sticky top-0 z-40 bg-marigold px-4 py-2 text-center text-sm font-semibold text-[#0e3b3c]">
        Sample page — this doctor and clinic are made up.{" "}
        <Link href="/" className="underline">
          Get your own page
        </Link>
      </div>
      <ProfileView doctor={doctor} nearby={[]} jsonLd={false} />
    </>
  );
}

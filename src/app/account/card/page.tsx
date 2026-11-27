import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CardViewToggle, DoctorCardView, PatientCardView } from "@/components/cards/DigitalCardPage";
import { requireDoctorPage } from "@/lib/auth/doctor";
import { getPublishedDoctor } from "@/lib/public/data";
import { getReadyTemplates } from "@/lib/public/templates";
import { absUrl, paths } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * The signed-in doctor's visiting card tools (/account/card): share link,
 * WhatsApp image, print-ready PDF and PNG, vCard. "Patient preview"
 * (?view=patient) shows exactly what patients see on the public card page.
 */
export default async function AccountCardPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const me = await requireDoctorPage();
  const { view } = await searchParams;
  const doc = me.doctor;
  const d = doc.status === "published" && doc.citySlug && doc.slug ? await getPublishedDoctor(doc.citySlug, doc.slug) : null;

  const back = (
    <Link href="/account" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-ink hover:text-lagoon">
      <ArrowLeft className="size-4" strokeWidth={2} /> My account
    </Link>
  );

  if (!d) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-8 sm:px-6">
        {back}
        <p className="rounded-xl border border-line bg-surface p-5 text-body">
          Your visiting card will be ready here as soon as your page is live.
        </p>
      </main>
    );
  }

  const cardPath = `${paths.doctor(d.citySlug, d.slug)}/card`;
  const cardUrl = d.subdomain ? `${d.shareUrl.replace(/\/$/, "")}/card` : absUrl(cardPath);
  const current = view === "patient" ? "patient" : "doctor";

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col bg-mist">
      <div className="mx-auto flex w-full max-w-content items-center justify-between gap-3 px-4 pt-6 sm:px-6">
        {back}
        <CardViewToggle current={current} patientHref="/account/card?view=patient" doctorHref="/account/card" />
      </div>
      {current === "patient" ? (
        <PatientCardView doctor={d} cardUrl={cardUrl} ready={await getReadyTemplates()} />
      ) : (
        <DoctorCardView doctor={d} cardUrl={cardUrl} filesBase={cardPath} version={d.updatedAt} ready={await getReadyTemplates()} />
      )}
    </div>
  );
}

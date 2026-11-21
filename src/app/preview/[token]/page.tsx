import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { CardView } from "@/components/cards/CardView";
import { SiteCardView } from "@/components/cards/SiteCardView";
import { ProfileView } from "@/components/public/ProfileView";
import { SiteView } from "@/components/public/SiteView";
import { connectToDatabase } from "@/lib/db";
import { readPreviewToken } from "@/lib/preview-link";
import { loadMasters, siteLinksFor, toPublicDoctor } from "@/lib/public/data";
import { buildPublicEstablishment } from "@/lib/public/establishments";
import { getReadyTemplates } from "@/lib/public/templates";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Establishment } from "@/models/Establishment";

/**
 * Private preview sent to a doctor, clinic or hospital ("Send preview link"
 * on the dashboard's Review step): their website and visiting card as they
 * will look, before publishing. Signed, expiring link; never indexed or cached.
 */

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your website preview | MediReach", robots: { index: false, follow: false } };

function Banner({ live, what }: { live: boolean; what: string }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-marigold px-4 py-2 text-center text-sm font-semibold text-white">
      <Eye className="size-4" aria-hidden />
      {live ? `Preview of your ${what}. It is live.` : `Preview of your ${what}. Not live yet: reply to us to approve it or ask for changes.`}
    </div>
  );
}

function CardSection({ children }: { children: React.ReactNode }) {
  return (
    <section className="border-t border-line bg-paper px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-4">
        <h2 className="font-display text-2xl font-semibold text-ink">Your digital visiting card</h2>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">{children}</div>
      </div>
    </section>
  );
}

export default async function PreviewLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const target = await readPreviewToken((await params).token);
  if (!target) notFound();
  await connectToDatabase();
  const ready = await getReadyTemplates();

  if (target.kind === "doctor") {
    const [doc, masters] = await Promise.all([DoctorProfile.findById(target.id).lean(), loadMasters()]);
    if (!doc) notFound();
    const sites = await siteLinksFor(doc.clinics.map((c) => c.establishmentId));
    const doctor = toPublicDoctor({ ...doc, citySlug: doc.citySlug || "pune", slug: doc.slug || "preview" }, masters, sites);
    return (
      <>
        <Banner live={doc.status === "published"} what="website" />
        <ProfileView doctor={doctor} nearby={[]} ready={ready} />
        <CardSection>
          <CardView doctor={doctor} variant="print" ready={ready} />
          <CardView doctor={doctor} variant="phone" ready={ready} />
        </CardSection>
      </>
    );
  }

  const doc = await Establishment.findById(target.id).lean();
  if (!doc) notFound();
  const site = await buildPublicEstablishment({ ...doc, citySlug: doc.citySlug || "pune", slug: doc.slug || "preview" });
  if (!site) notFound();
  return (
    <>
      <Banner live={doc.status === "published"} what={doc.kind === "hospital" ? "hospital website" : "clinic website"} />
      <SiteView site={site} ready={ready} jsonLd={false} />
      <CardSection>
        <SiteCardView site={site} variant="print" />
        <SiteCardView site={site} variant="phone" />
      </CardSection>
    </>
  );
}

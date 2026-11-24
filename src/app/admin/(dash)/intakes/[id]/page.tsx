import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MessageCircle, Phone } from "lucide-react";
import { Pill } from "@/components/admin/StatusBadge";
import { rolesFor } from "@/components/admin/nav";
import { sampleCardFaces } from "@/components/cards/SampleCardFace";
import { IntakeForm } from "@/components/intake/IntakeForm";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/admin";
import { isObjectId } from "@/lib/admin/list";
import { INTAKE_STATUS_LABEL, INTAKE_STATUS_TONE } from "@/lib/admin/labels";
import { connectToDatabase } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { INTAKE_KIND_LABEL, allPhotos, designSummary, missingForSubmit, str } from "@/lib/intake/form";
import { intakeClinicTypes, intakePlaces } from "@/lib/intake/places";
import { toView } from "@/lib/intake/server";
import { getPublicSiteData } from "@/lib/public/site-data";
import { Intake } from "@/models/Intake";
import { IntakeReviewControls } from "./IntakeReviewControls";

export const metadata: Metadata = { title: "Website form" };

/** Review one form: contact the applicant, fill gaps (same form, admin mode), then create the draft site. */
export default async function IntakeReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPage(rolesFor("/admin/intakes"));
  const { id } = await params;
  if (!isObjectId(id)) notFound();
  await connectToDatabase();
  const [doc, site, places, clinicTypes] = await Promise.all([Intake.findById(id).lean(), getPublicSiteData(), intakePlaces(), intakeClinicTypes()]);
  if (!doc) notFound();
  const view = toView(doc);
  const missing = missingForSubmit(view.kind, view.data);
  const photos = allPhotos(view.photos, view.kind, view.data);
  const mobile = str(view.data.mobile);
  const wa = str(view.data.whatsapp) || mobile;
  const name = doc.name || view.email;
  const draftHref = doc.convertedTo ? (doc.convertedTo.kind === "doctor" ? `/admin/doctors/${doc.convertedTo.id}` : `/admin/establishments/${doc.convertedTo.id}`) : undefined;
  const design = designSummary(view.kind, view.data);
  const waText = `Hello ${name}, this is MediReach about your website form ${view.ref}.`;

  return (
    <div className="space-y-5">
      <Link href={`/admin/intakes?kind=${doc.kind}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-ink">
        <ArrowLeft className="size-4" /> All {INTAKE_KIND_LABEL[doc.kind].toLowerCase()} forms
      </Link>

      <section className="rounded-xl border border-line bg-card p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h2 className="flex flex-wrap items-center gap-2 font-display text-2xl font-semibold text-ink">
              {name} <Pill tone={INTAKE_STATUS_TONE[view.status]}>{INTAKE_STATUS_LABEL[view.status]}</Pill>
              {doc.updatedAfterSubmitAt && view.status !== "draft" && <Pill tone="clay">Updated after sending</Pill>}
            </h2>
            <p className="text-sm text-muted-foreground">
              {INTAKE_KIND_LABEL[view.kind]} · {view.ref} · started {formatDateTime(doc.createdAt)}
              {doc.submittedAt ? ` · sent ${formatDateTime(doc.submittedAt)}` : " · not sent yet"}
              {` · last saved ${formatDateTime(doc.lastSavedAt)}`}
            </p>
            <p className="text-sm">
              {missing.length ? (
                <span className="text-clay-text">Missing: {missing.map((m) => m.label).join(", ")}</span>
              ) : (
                <span className="text-leaf-text">All required fields filled.</span>
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              Photos: {photos.length} uploaded
              {view.photos.viaWhatsapp ? " · the applicant chose to send photos on WhatsApp (search the chats for the ref)" : ""}
            </p>
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              Design: website <strong className="text-ink">{design.website}</strong> · visiting card <strong className="text-ink">{design.card}</strong>
              <Pill tone={design.final ? "leaf" : "marigold"}>{design.final ? "Final" : design.decision}</Pill>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {mobile && (
              <Button asChild size="sm" variant="outline">
                <a href={`tel:+91${mobile}`}>
                  <Phone /> Call
                </a>
              </Button>
            )}
            {wa && (
              <Button asChild size="sm" variant="outline">
                <a href={`https://wa.me/91${wa}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener">
                  <MessageCircle /> WhatsApp
                </a>
              </Button>
            )}
            <Button asChild size="sm" variant="outline">
              <a href={`mailto:${view.email}?subject=${encodeURIComponent(`Your MediReach website form ${view.ref}`)}`}>
                <Mail /> Email
              </a>
            </Button>
          </div>
        </div>
        {photos.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Uploaded photos (open full size)">
            {photos.map((p) => (
              <li key={p.publicId}>
                <a href={p.url} target="_blank" rel="noopener" title="Open full size">
                  {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
                  <img
                    src={p.url.replace("/image/upload/", "/image/upload/c_fill,w_160,h_120,f_auto,q_auto/")}
                    alt={p.caption || "Uploaded photo"}
                    className="h-[60px] w-[80px] rounded-md border border-line object-cover"
                  />
                </a>
              </li>
            ))}
          </ul>
        )}
        <IntakeReviewControls id={view.id} status={view.status} notes={doc.adminNotes ?? ""} draftHref={draftHref} canDelete={admin.role !== "sales"} kind={view.kind} />
      </section>

      <IntakeForm kind={view.kind} initial={view} waNumber={site.whatsappNumber} mode="admin" cardFaces={sampleCardFaces(view.kind)} places={places} clinicTypes={view.kind === "clinic" ? clinicTypes : undefined} />
    </div>
  );
}

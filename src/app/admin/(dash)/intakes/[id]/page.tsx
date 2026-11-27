import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ListChecks, Mail, MessageCircle, Phone } from "lucide-react";
import { Pill, StatusBadge } from "@/components/admin/StatusBadge";
import { rolesFor } from "@/components/admin/nav";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/admin";
import { intakeScope } from "@/lib/admin/scope";
import { isObjectId } from "@/lib/admin/list";
import { INTAKE_STATUS_LABEL, INTAKE_STATUS_TONE } from "@/lib/admin/labels";
import { connectToDatabase } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { INTAKE_KIND_LABEL, allPhotos, designSummary, missingForSubmit, str } from "@/lib/intake/form";
import { toView } from "@/lib/intake/server";
import { intakeSites, syncPublishedIntakes } from "@/lib/intake/site-status";
import { Intake } from "@/models/Intake";
import { IntakeReviewControls } from "./IntakeReviewControls";
import { SalesPanel, salesPanelData } from "./SalesPanel";

export const metadata: Metadata = { title: "Website form" };

/**
 * One website form: contact the applicant, status and notes, and the button to
 * create / open the website draft. The answers themselves are checked in the
 * draft editor, step by step (each step shows the form's answers), so the
 * form is not repeated here.
 */
export default async function IntakeReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPage(rolesFor("/admin/intakes"));
  const { id } = await params;
  if (!isObjectId(id)) notFound();
  await connectToDatabase();
  await syncPublishedIntakes();
  // Sales executives: only forms made into their own websites.
  const doc = await Intake.findOne({ _id: id, ...(await intakeScope(admin)) }).lean();
  if (!doc) notFound();
  const draft = (await intakeSites([doc])).get(String(doc._id));
  const view = toView(doc);
  const missing = missingForSubmit(view.kind, view.data);
  const photos = allPhotos(view.photos, view.kind, view.data);
  const mobile = str(view.data.mobile);
  const wa = str(view.data.whatsapp) || mobile;
  const name = doc.name || view.email;
  const design = designSummary(view.kind, view.data);
  const waText = `Hello ${name}, this is MediReach about your website form ${view.ref}.`;
  const salesPanel = await salesPanelData(doc, admin.role === "superadmin");

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
            {/* Once the website is live, gaps in the form were filled in the website itself. */}
            {draft?.status !== "published" && (
              <p className="text-sm">
                {missing.length ? (
                  <span className="text-clay-text">
                    {draft ? "Not in the form (fill in the website draft)" : "Missing"}: {missing.map((m) => m.label).join(", ")}
                  </span>
                ) : (
                  <span className="text-leaf-text">All required fields filled.</span>
                )}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Photos: {photos.length} uploaded
              {view.photos.viaWhatsapp ? " · the applicant chose to send photos on WhatsApp (search the chats for the ref)" : ""}
            </p>
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              Design: website <strong className="text-ink">{design.website}</strong> (visiting card in the same design)
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
        <IntakeReviewControls id={view.id} status={view.status} notes={doc.adminNotes ?? ""} draftHref={draft?.href} canDelete={admin.role !== "sales"} kind={view.kind} />
      </section>

      <section className="flex items-start gap-3 rounded-xl border border-line bg-sage/50 p-4 text-sm text-ink">
        <ListChecks className="mt-0.5 size-4 shrink-0" aria-hidden />
        {draft ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            Website draft <StatusBadge status={draft.status} />
            <span className="text-muted-foreground">
              Open it and go through each step: the form&apos;s answers are shown with <em>Use</em> / <em>{view.kind === "doctor" ? "Fill" : "Add"}</em> buttons, so you can confirm or change them, then publish from the last step.
              {draft.status === "published" ? " Publishing marked this form done." : ""}
            </span>
          </p>
        ) : (
          <p className="text-muted-foreground">
            <strong className="text-ink">Create the website draft</strong> to review this form. The draft is filled from the answers; you then check it step by step (each step shows the form&apos;s answers to confirm or change) and publish it.
          </p>
        )}
      </section>

      <SalesPanel intakeId={view.id} data={salesPanel} typedName={str(view.data.salesName)} typedId={str(view.data.salesStaffId)} />
    </div>
  );
}

"use server";

import { after } from "next/server";
import { z } from "zod";
import { ActionError, fieldErrorsOf, type ActionResult } from "@/lib/admin/action";
import { audit, shallowDiff } from "@/lib/api/audit";
import { hitRateLimit } from "@/lib/api/rate-limit";
import { DoctorAuthError, doctorActor, ownerActor, requireAccount, requireDoctor } from "@/lib/auth/doctor";
import { changeRequestSchema } from "@/lib/doctors/account";
import { sectionPayload as doctorSectionPayload, sectionSchemas as doctorSectionSchemas, stepForField as doctorStepForField, type DoctorForm } from "@/lib/doctors/form";
import { applySection as applyDoctorSection, docToForm as doctorDocToForm, ensureUrlKeys as ensureDoctorUrlKeys, publishProblems, scanDoctor } from "@/lib/doctors/server";
import { healthTipsSchema } from "@/lib/doctors/self-profile";
import { sectionPayload as siteSectionPayload, sectionSchemas as siteSectionSchemas, stepForField as siteStepForField, type EstablishmentForm } from "@/lib/establishments/form";
import {
  applySection as applySiteSection,
  docToForm as siteDocToForm,
  ensureUrlKeys as ensureSiteUrlKeys,
  publishProblems as siteProblems,
  scanEstablishment,
} from "@/lib/establishments/server";
import { syncDoctorLinksFromEstablishment, syncEstablishmentDoctors } from "@/lib/establishments/links";
import { connectToDatabase } from "@/lib/db";
import { INQUIRY_STATUSES } from "@/lib/inquiries";
import { optionalEnv } from "@/lib/env";
import { createSignedUpload, type SignedUploadParams } from "@/lib/integrations/cloudinary";
import { sendEmail } from "@/lib/integrations/email";
import { revalidateDoctorPages, revalidateEstablishmentPages } from "@/lib/public/revalidate";
import { getSettings } from "@/lib/settings";
import { absUrl } from "@/lib/site";
import { createUpdateRequest } from "@/lib/update-requests/create";
import { Inquiry } from "@/models/Inquiry";
import { DOCTOR_SELF_STEPS, SITE_SELF_STEPS } from "@/lib/self-edit";

/**
 * Self-edit actions for doctors and clinic/hospital owners. They can change
 * everything on their website except its address (SEO), the business record
 * and publishing, using the same section schemas and save logic as the
 * dashboard editors. The account is re-read from the database on every call;
 * free text runs the NMC scan; live pages must stay publishable; every change
 * is audit-logged and refreshes the live page straight away. The website UID
 * is never part of any section, so owners can't change it.
 */

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof ActionError) return { ok: false, error: err.message, fieldErrors: err.fieldErrors };
    if (err instanceof DoctorAuthError) return { ok: false, error: err.message };
    console.error("[account action]", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

function parseOrThrow<S extends z.ZodTypeAny>(schema: S, raw: unknown): z.output<S> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = fieldErrorsOf(parsed.error);
    throw new ActionError(Object.values(fieldErrors)[0] ?? "Please check the form.", fieldErrors);
  }
  return parsed.data;
}

// Owners upload their own photos: profile photo, gallery, award and "Beyond medicine" photos, logo and cover.
const accountUploadSchema = z.object({ purpose: z.enum(["doctor-photo", "gallery", "award", "interests", "logo", "cover"]) });

/** Signed Cloudinary upload params for the signed-in doctor or owner. */
export async function signAccountUploadAction(raw: unknown): Promise<ActionResult<SignedUploadParams>> {
  return run(async () => {
    const me = await requireAccount();
    const parsed = accountUploadSchema.safeParse(raw);
    if (!parsed.success) throw new ActionError("This upload isn't allowed.");
    const limit = await hitRateLimit(`account-upload:${me.email}`, 60, 60 * 60_000);
    if (!limit.allowed) throw new ActionError("Too many uploads. Please try again in an hour.");
    return createSignedUpload(parsed.data.purpose);
  });
}

export async function requestChangeAction(raw: unknown): Promise<ActionResult<{ free: boolean; price: number }>> {
  return run(async () => {
    const me = await requireDoctor();
    const parsed = changeRequestSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors = fieldErrorsOf(parsed.error);
      throw new ActionError(Object.values(fieldErrors)[0] ?? "Please check the form.", fieldErrors);
    }
    const limit = await hitRateLimit(`change-request:${me.id}`, 5, 24 * 60 * 60_000);
    if (!limit.allowed) throw new ActionError("You've sent several requests today. We'll get to them soon, or message us on WhatsApp.");

    const req = await createUpdateRequest(me.id, parsed.data.description);
    if (!req) throw new DoctorAuthError();
    await audit(doctorActor(me), "update_request.create", {
      entity: "UpdateRequest",
      entityId: req.id,
      diff: { doctorId: me.id, free: req.free, via: "account" },
    });

    const to = optionalEnv("LEAD_NOTIFY_EMAIL") || optionalEnv("ADMIN_EMAIL");
    if (to) {
      after(() =>
        sendEmail({
          to,
          subject: `Change request from ${me.name}`,
          text: `${me.name} (${me.email}) asked for a change${req.free ? " (free first update)" : ""}:\n\n${parsed.data.description}\n\n${absUrl("/admin/update-requests")}`,
          html: `<p><strong>${escapeHtml(me.name)}</strong> (${escapeHtml(me.email)}) asked for a change${req.free ? " (free first update)" : ""}:</p><p style="white-space:pre-wrap">${escapeHtml(parsed.data.description)}</p><p><a href="${absUrl("/admin/update-requests")}">Open update requests</a></p>`,
        }).then(() => undefined),
      );
    }
    return { free: req.free, price: req.price };
  });
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// ---------------------------------------------------------------------------
// Full self-edit: the same sections as the dashboard editors
// ---------------------------------------------------------------------------


const doctorSectionInput = z.object({ step: z.enum(DOCTOR_SELF_STEPS), data: z.unknown() });
const siteSectionInput = z.object({ id: z.string().regex(/^[a-f0-9]{24}$/i), step: z.enum(SITE_SELF_STEPS), data: z.unknown() });

/** Owners never save NMC-banned wording in what they edit, live or not. */
function refuseBannedWording(issues: { field: string; phrase: string }[]) {
  if (issues.length === 0) return;
  const fieldErrors = Object.fromEntries(issues.map((i) => [i.field, `Not allowed under NMC guidelines: "${i.phrase}"`]));
  throw new ActionError("Some wording isn't allowed under NMC guidelines. Please change the highlighted text.", fieldErrors);
}

/** Save one section of the doctor's own page; live pages update straight away. */
export async function saveMyDoctorSectionAction(raw: unknown): Promise<ActionResult<{ form: DoctorForm; savedAt: string }>> {
  return run(async () => {
    const me = await requireDoctor();
    const { step, data } = parseOrThrow(doctorSectionInput, raw);
    const input = parseOrThrow(doctorSectionSchemas[step], data) as Record<string, unknown>;
    const doc = me.doctor;
    // The login email is the team's to change (it decides who can log in).
    if (step === "contact") input.ownerEmail = doc.ownerEmail;

    const before = doctorDocToForm(doc.toObject());
    const oldRoute = { citySlug: doc.citySlug, slug: doc.slug };
    const settings = await getSettings();
    // Gaps the page already had are the team's to fix; only a change that adds a new one is refused.
    const problemsBefore = doc.status === "published" ? publishProblems(doc, scanDoctor(doc, settings.bannedPhrases)) : [];
    await applyDoctorSection(doc, step, input as never, null);
    await ensureDoctorUrlKeys(doc);
    const issues = scanDoctor(doc, settings.bannedPhrases);
    refuseBannedWording(issues.filter((i) => doctorStepForField(i.field) === step));
    if (doc.status === "published") {
      const problems = publishProblems(doc, issues).filter((p) => !problemsBefore.includes(p));
      if (problems.length > 0) {
        const fieldErrors = Object.fromEntries(issues.map((i) => [i.field, `Not allowed under NMC guidelines: "${i.phrase}"`]));
        throw new ActionError(`Not saved: your page is live and this change would break the rules (${problems.join("; ")}).`, fieldErrors);
      }
    }
    doc.compliance.issues = issues;
    doc.compliance.lastScanAt = new Date();
    await doc.save();

    const after = doctorDocToForm(doc.toObject());
    const diff = shallowDiff(
      (doctorSectionPayload(step, before) ?? {}) as Record<string, unknown>,
      (doctorSectionPayload(step, after) ?? {}) as Record<string, unknown>,
    );
    if (Object.keys(diff).length > 0) await audit(doctorActor(me), `doctor.self_edit.${step}`, { entity: "DoctorProfile", entityId: doc._id, diff });
    if (step === "clinics") await syncEstablishmentDoctors(doc._id, before.establishmentIds, after.establishmentIds);
    if (doc.status === "published") revalidateDoctorPages(oldRoute, { citySlug: doc.citySlug, slug: doc.slug });
    return { form: after, savedAt: new Date().toISOString() };
  });
}

/** Save one section of a clinic or hospital site the signed-in owner owns. */
export async function saveMySiteSectionAction(raw: unknown): Promise<ActionResult<{ form: EstablishmentForm; savedAt: string }>> {
  return run(async () => {
    const me = await requireAccount();
    const { id, step, data } = parseOrThrow(siteSectionInput, raw);
    const doc = me.sites.find((s) => String(s._id) === id);
    if (!doc) throw new ActionError("You can't edit that site. Please reload the page.");
    const input = parseOrThrow(siteSectionSchemas[step], data);

    const before = siteDocToForm(doc.toObject());
    const oldRoute = { kind: doc.kind, citySlug: doc.citySlug, slug: doc.slug };
    const settings = await getSettings();
    const problemsBefore = doc.status === "published" ? siteProblems(doc, scanEstablishment(doc, settings.bannedPhrases)) : [];
    await applySiteSection(doc, step, input as never, null);
    await ensureSiteUrlKeys(doc);
    const issues = scanEstablishment(doc, settings.bannedPhrases);
    refuseBannedWording(issues.filter((i) => siteStepForField(i.field) === step));
    if (doc.status === "published") {
      const problems = siteProblems(doc, issues).filter((p) => !problemsBefore.includes(p));
      if (problems.length > 0) {
        const fieldErrors = Object.fromEntries(issues.map((i) => [i.field, `Not allowed under NMC guidelines: "${i.phrase}"`]));
        throw new ActionError(`Not saved: your site is live and this change would break the rules (${problems.join("; ")}).`, fieldErrors);
      }
    }
    doc.compliance.issues = issues;
    doc.compliance.lastScanAt = new Date();
    await doc.save();

    const after = siteDocToForm(doc.toObject());
    const diff = shallowDiff(
      (siteSectionPayload(step, before) ?? {}) as Record<string, unknown>,
      (siteSectionPayload(step, after) ?? {}) as Record<string, unknown>,
    );
    if (Object.keys(diff).length > 0) await audit(ownerActor(me, id), `${doc.kind}.self_edit.${step}`, { entity: "Establishment", entityId: doc._id, diff });
    if (step === "doctors") {
      const linked = (f: EstablishmentForm) => f.doctors.map((d) => d.doctorProfileId).filter(Boolean);
      await syncDoctorLinksFromEstablishment(doc._id, linked(before), linked(after));
    }
    if (doc.status === "published") revalidateEstablishmentPages(oldRoute, { kind: doc.kind, citySlug: doc.citySlug, slug: doc.slug });
    return { form: after, savedAt: new Date().toISOString() };
  });
}

// ---------------------------------------------------------------------------
// Health tips and appointment requests (doctors)
// ---------------------------------------------------------------------------

/** Show or hide the Health tips section, and which tips it shows (empty = automatic). */
export async function saveHealthTipsAction(raw: unknown): Promise<ActionResult<{ savedAt: string }>> {
  return run(async () => {
    const me = await requireDoctor();
    const input = parseOrThrow(healthTipsSchema, raw);
    const doc = me.doctor;
    const before = { show: doc.showHealthTips !== false, slugs: [...(doc.healthTipSlugs ?? [])] };
    doc.set({ showHealthTips: input.show, healthTipSlugs: input.slugs });
    await doc.save();
    await audit(doctorActor(me), "doctor.self_edit", { entity: "DoctorProfile", entityId: doc._id, diff: { healthTips: { from: before, to: input } } });
    if (doc.status === "published") revalidateDoctorPages({ citySlug: doc.citySlug, slug: doc.slug });
    return { savedAt: new Date().toISOString() };
  });
}

const inquiryUpdateSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/i),
  status: z.enum(INQUIRY_STATUSES).optional(),
  note: z.string().trim().max(500, "Use at most 500 characters.").optional(),
});

/** Change an appointment request's status or private note (only the doctor's own). */
export async function updateInquiryAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const me = await requireDoctor();
    const input = parseOrThrow(inquiryUpdateSchema, raw);
    await connectToDatabase();
    const set: Record<string, unknown> = {};
    if (input.status) set.status = input.status;
    if (input.note !== undefined) set.note = input.note;
    const res = await Inquiry.updateOne({ _id: input.id, doctorId: me.doctor._id }, { $set: set });
    if (res.matchedCount === 0) throw new ActionError("That request isn't available any more. Please reload the page.");
    return { id: input.id };
  });
}

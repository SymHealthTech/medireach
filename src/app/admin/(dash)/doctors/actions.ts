"use server";

import { Types } from "mongoose";
import { z } from "zod";
import { ActionError, adminAction, auditCtx } from "@/lib/admin/action";
import { audit, shallowDiff } from "@/lib/api/audit";
import { hitRateLimit } from "@/lib/api/rate-limit";
import { can } from "@/lib/auth/admin";
import { sendLoginLink } from "@/lib/auth/login-link";
import { DOCTOR_SHORT_SLUG_PREFIX } from "@/config/reserved";
import { sectionPayload, sectionSchemas, STEPS, type DoctorForm, type StepKey } from "@/lib/doctors/form";
import {
  applySection,
  docToForm,
  ensureUrlKeys,
  publishProblems,
  scanDoctor,
  urlKeyAvailable,
} from "@/lib/doctors/server";
import { revalidateDoctorPages } from "@/lib/public/revalidate";
import { getSettings } from "@/lib/settings";
import { SLUG_RE, subdomainError } from "@/lib/slug";
import { DoctorProfile } from "@/models/DoctorProfile";
import { ensureUid } from "@/lib/uid";
import { Lead } from "@/models/Lead";
import { syncEstablishmentDoctors } from "@/lib/establishments/links";

const id = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id.");
const stepKeys = STEPS.map((s) => s.key) as [StepKey, ...StepKey[]];

async function load(doctorId: string) {
  const doc = await DoctorProfile.findById(doctorId);
  if (!doc) throw new ActionError("Doctor not found.");
  return doc;
}

export interface SaveResult {
  id: string;
  form: DoctorForm;
  savedAt: string;
}

/**
 * Autosave one step. Creates the draft on the first save of "basics".
 * Published pages are refreshed straight away (edits go live on save).
 */
export const saveDoctorSectionAction = adminAction(
  {
    schema: z.object({
      id: id.optional(),
      step: z.enum(stepKeys),
      data: z.unknown(),
      leadId: id.optional(),
    }),
  },
  async ({ id: doctorId, step, data, leadId }, admin): Promise<SaveResult> => {
    const parsed = sectionSchemas[step].safeParse(data);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const i of parsed.error.issues) fieldErrors[i.path.join(".")] ??= i.message;
      throw new ActionError(Object.values(fieldErrors)[0] ?? "Please check this step.", fieldErrors);
    }

    let doc;
    if (doctorId) {
      doc = await load(doctorId);
      if (doc.status === "published" && !can.publish(admin.role)) {
        throw new ActionError("This page is live. Only an admin can edit published pages.");
      }
    } else {
      if (step !== "basics") throw new ActionError("Start with the doctor's name.");
      doc = new DoctorProfile({ firstName: "x", lastName: "x", status: "draft" });
    }

    const before = docToForm(doc.toObject());
    const oldRoute = { citySlug: doc.citySlug, slug: doc.slug };
    await applySection(doc, step, parsed.data as never, admin);
    await ensureUrlKeys(doc);
    // Keep the stored compliance scan fresh so lists can show issues.
    const settings = await getSettings();
    const issues = scanDoctor(doc, settings.bannedPhrases);
    // Saves on a live page go public at once, so they must keep it publishable.
    if (doc.status === "published") {
      const problems = publishProblems(doc, issues);
      if (problems.length > 0) {
        const fieldErrors = Object.fromEntries(issues.map((i) => [i.field, `Not allowed: "${i.phrase}"`]));
        throw new ActionError(`Not saved — this page is live and the change would break the rules: ${problems.join("; ")}.`, fieldErrors);
      }
    }
    doc.compliance.issues = issues;
    doc.compliance.lastScanAt = new Date();
    await doc.save();

    const after = docToForm(doc.toObject());
    const isNew = !doctorId;
    await audit(auditCtx(admin), isNew ? "doctor.create" : `doctor.update.${step}`, {
      entity: "DoctorProfile",
      entityId: doc._id,
      diff: isNew ? { name: `${after.firstName} ${after.lastName}` } : shallowDiff(sectionOf(before, step), sectionOf(after, step)),
    });

    if (isNew && leadId) {
      await Lead.updateOne({ _id: leadId }, { $set: { status: "won" } });
    }
    if (doc.status === "published") revalidateDoctorPages(oldRoute, { citySlug: doc.citySlug, slug: doc.slug });
    if (step === "business" || step === "clinics") {
      await syncEstablishmentDoctors(doc._id, before.establishmentIds, after.establishmentIds);
    }

    return { id: String(doc._id), form: after, savedAt: new Date().toISOString() };
  },
);

function sectionOf(f: DoctorForm, step: StepKey): Record<string, unknown> {
  return (sectionPayload(step, f) ?? {}) as Record<string, unknown>;
}

/** Live check for the SEO step (slug / short link / subdomain). */
export const checkUrlKeyAction = adminAction(
  {
    schema: z.object({
      id: id.optional(),
      kind: z.enum(["slug", "shortSlug", "subdomain"]),
      value: z.string().trim().toLowerCase().max(100),
      citySlug: z.string().max(60).optional(),
    }),
  },
  async ({ id: doctorId, kind, value, citySlug }) => {
    if (!value) return { available: false, message: "Required." };
    if (kind === "subdomain") {
      const err = subdomainError(value);
      if (err) return { available: false, message: err };
    } else if (!SLUG_RE.test(value)) {
      return { available: false, message: "Use lowercase letters, numbers and hyphens." };
    }
    if (kind === "shortSlug" && !value.startsWith(DOCTOR_SHORT_SLUG_PREFIX)) {
      return { available: false, message: `Short links start with "${DOCTOR_SHORT_SLUG_PREFIX}".` };
    }
    const available = await urlKeyAvailable(kind, value, { excludeId: doctorId, citySlug });
    return { available, message: available ? "Available" : "Already taken" };
  },
);

export const publishDoctorAction = adminAction(
  { schema: z.object({ id }), roles: ["superadmin", "admin"] },
  async ({ id: doctorId }, admin) => {
    const doc = await load(doctorId);
    await ensureUrlKeys(doc);
    const settings = await getSettings();
    const issues = scanDoctor(doc, settings.bannedPhrases);
    doc.compliance.issues = issues;
    doc.compliance.lastScanAt = new Date();
    const problems = publishProblems(doc, issues);
    if (problems.length > 0) {
      await doc.save();
      throw new ActionError(`Can't publish yet: ${problems.join("; ")}.`);
    }
    const wasPublished = doc.status === "published";
    doc.status = "published";
    doc.publishedAt = doc.publishedAt ?? new Date();
    await doc.save();
    await audit(auditCtx(admin), wasPublished ? "doctor.republish" : "doctor.publish", {
      entity: "DoctorProfile",
      entityId: doc._id,
      diff: { url: `/${doc.citySlug}/doctor/${doc.slug}` },
    });
    revalidateDoctorPages({ citySlug: doc.citySlug, slug: doc.slug });
    return { form: docToForm(doc.toObject()) };
  },
);

const statusChange = (to: "draft" | "review" | "suspended", action: string, roles?: readonly ("superadmin" | "admin" | "sales")[]) =>
  adminAction({ schema: z.object({ id }), ...(roles ? { roles } : {}) }, async ({ id: doctorId }, admin) => {
    const doc = await load(doctorId);
    const from = doc.status;
    if (to === "review" && from === "published") throw new ActionError("This page is already published.");
    doc.status = to;
    await doc.save();
    await audit(auditCtx(admin), action, { entity: "DoctorProfile", entityId: doc._id, diff: { status: { from, to } } });
    if (from === "published") revalidateDoctorPages({ citySlug: doc.citySlug, slug: doc.slug });
    return { form: docToForm(doc.toObject()) };
  });

export const unpublishDoctorAction = statusChange("draft", "doctor.unpublish", ["superadmin", "admin"]);
export const suspendDoctorAction = statusChange("suspended", "doctor.suspend", ["superadmin", "admin"]);
export const submitForReviewAction = statusChange("review", "doctor.submit_review");

/** Copy a doctor into a new draft (URL keys, login, founding and publish data are not copied). */
export const duplicateDoctorAction = adminAction({ schema: z.object({ id }) }, async ({ id: doctorId }, admin) => {
  const src = await DoctorProfile.findById(doctorId).lean();
  if (!src) throw new ActionError("Doctor not found.");
  const {
    _id: _ignoredId,
    slug: _s,
    shortSlug: _ss,
    subdomain: _sd,
    ownerEmail: _oe,
    // A copy is a new draft, not a paying customer: no founding or renewal data.
    founding: _f,
    foundingDoctor: _fd,
    foundingNumber: _fn,
    hostingFreeUntil: _hf,
    setupPaidAt: _sp,
    renewalPrice: _rp,
    renewalDueDate: _rd,
    renewalStatus: _rs,
    publishedAt: _pa,
    createdAt: _ca,
    updatedAt: _ua,
    compliance: _c,
    ...rest
  } = src;
  const copy = new DoctorProfile({
    ...rest,
    firstName: src.firstName,
    lastName: `${src.lastName} (copy)`,
    status: "draft",
    clinics: src.clinics.map(({ _id: _cid, ...c }) => ({ ...c, _id: new Types.ObjectId() })),
  });
  await copy.save();
  await syncEstablishmentDoctors(copy._id, [], copy.establishmentIds.map(String));
  await audit(auditCtx(admin), "doctor.duplicate", { entity: "DoctorProfile", entityId: copy._id, diff: { from: doctorId } });
  return { id: String(copy._id) };
});

/**
 * Email the doctor a login link for self-editing (welcome wording). Uses the
 * saved login email, so the toggle and email must be saved first.
 */
export const sendDoctorLoginEmailAction = adminAction({ schema: z.object({ id }) }, async ({ id: doctorId }, admin) => {
  const doc = await DoctorProfile.findById(doctorId).select({ ownerEmail: 1, uid: 1 }).lean();
  if (!doc) throw new ActionError("Doctor not found.");
  if (!doc.ownerEmail) throw new ActionError("Turn on self-edit login and save the doctor's email first.");
  const limit = await hitRateLimit(`login-link:admin:${doctorId}`, 5, 60 * 60_000);
  if (!limit.allowed) throw new ActionError("Several login emails were sent in the last hour. Please wait before sending another.");
  const sent = await sendLoginLink(doc.ownerEmail, { welcome: true, uid: await ensureUid(DoctorProfile as never, doc, "doctor") });
  if (!sent) throw new ActionError("The email couldn't be sent. Check the email settings (RESEND_API_KEY) and try again.");
  await audit(auditCtx(admin), "doctor.send_login_email", { entity: "DoctorProfile", entityId: doctorId, diff: { to: doc.ownerEmail } });
  return { to: doc.ownerEmail };
});

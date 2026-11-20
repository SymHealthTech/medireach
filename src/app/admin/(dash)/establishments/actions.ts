"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { ActionError, adminAction, auditCtx, fieldErrorsOf } from "@/lib/admin/action";
import { audit, shallowDiff } from "@/lib/api/audit";
import { can } from "@/lib/auth/admin";
import { hitRateLimit } from "@/lib/api/rate-limit";
import { sendLoginLink } from "@/lib/auth/login-link";
import { ESTABLISHMENT_KINDS } from "@/lib/constants";
import { sectionPayload, sectionSchemas, STEPS, type EstablishmentForm, type StepKey } from "@/lib/establishments/form";
import { syncDoctorLinksFromEstablishment } from "@/lib/establishments/links";
import { applySection, docToForm, ensureUrlKeys, publishProblems, scanEstablishment, urlKeyAvailable } from "@/lib/establishments/server";
import { CACHE_TAGS } from "@/lib/public/tags";
import { getSettings } from "@/lib/settings";
import { SLUG_RE, subdomainError } from "@/lib/slug";
import { sitePath } from "@/lib/site";
import { RESERVED_SUBDOMAINS } from "@/config/reserved";
import { Establishment } from "@/models/Establishment";

const id = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id.");
const stepKeys = STEPS.map((s) => s.key) as [StepKey, ...StepKey[]];

async function load(establishmentId: string) {
  const doc = await Establishment.findById(establishmentId);
  if (!doc) throw new ActionError("Clinic or hospital not found.");
  return doc;
}

type Route = { kind: "clinic" | "hospital"; citySlug?: string; slug?: string };

/** The site pages (old address too, if it changed), anything listing clinics/hospitals, and doctor pages ("Practises at"). */
function revalidatePublic(...routes: Route[]) {
  revalidateTag(CACHE_TAGS.establishments);
  revalidateTag(CACHE_TAGS.doctors);
  for (const r of routes) if (r.citySlug && r.slug) revalidatePath(sitePath({ kind: r.kind, citySlug: r.citySlug, slug: r.slug }));
}

const linkedDoctorIds = (f: EstablishmentForm) => f.doctors.map((d) => d.doctorProfileId).filter(Boolean);

export interface EstablishmentSaveResult {
  id: string;
  form: EstablishmentForm;
  savedAt: string;
}

/** Autosave one step. Creates the draft on the first save of "basics". */
export const saveEstablishmentSectionAction = adminAction(
  {
    schema: z.object({
      id: id.optional(),
      kind: z.enum(ESTABLISHMENT_KINDS).optional(),
      step: z.enum(stepKeys),
      data: z.unknown(),
    }),
  },
  async ({ id: establishmentId, kind, step, data }, admin): Promise<EstablishmentSaveResult> => {
    const parsed = sectionSchemas[step].safeParse(data);
    if (!parsed.success) {
      const fieldErrors = fieldErrorsOf(parsed.error);
      throw new ActionError(Object.values(fieldErrors)[0] ?? "Please check this step.", fieldErrors);
    }

    let doc;
    if (establishmentId) {
      doc = await load(establishmentId);
      if (doc.status === "published" && !can.publish(admin.role)) throw new ActionError("This site is live. Only an admin can edit published sites.");
    } else {
      if (step !== "basics") throw new ActionError("Start with the name.");
      const k = kind ?? "clinic";
      doc = new Establishment({ kind: k, plan: k, name: "x", status: "draft" });
    }

    const before = docToForm(doc.toObject());
    const oldRoute: Route = { kind: doc.kind, citySlug: doc.citySlug, slug: doc.slug };
    await applySection(doc, step, parsed.data as never, admin);
    await ensureUrlKeys(doc);
    const settings = await getSettings();
    const issues = scanEstablishment(doc, settings.bannedPhrases);
    if (doc.status === "published") {
      const problems = publishProblems(doc, issues);
      if (problems.length > 0) {
        const fieldErrors = Object.fromEntries(issues.map((i) => [i.field, `Not allowed: "${i.phrase}"`]));
        throw new ActionError(`Not saved — this site is live and the change would break the rules: ${problems.join("; ")}.`, fieldErrors);
      }
    }
    doc.compliance.issues = issues;
    doc.compliance.lastScanAt = new Date();
    await doc.save();

    const after = docToForm(doc.toObject());
    const isNew = !establishmentId;
    await audit(auditCtx(admin), isNew ? `${doc.kind}.create` : `${doc.kind}.update.${step}`, {
      entity: "Establishment",
      entityId: doc._id,
      diff: isNew
        ? { name: after.name }
        : shallowDiff((sectionPayload(step, before) ?? {}) as Record<string, unknown>, (sectionPayload(step, after) ?? {}) as Record<string, unknown>),
    });
    if (step === "doctors") await syncDoctorLinksFromEstablishment(doc._id, linkedDoctorIds(before), linkedDoctorIds(after));
    if (doc.status === "published") revalidatePublic(oldRoute, { kind: doc.kind, citySlug: doc.citySlug, slug: doc.slug });

    return { id: String(doc._id), form: after, savedAt: new Date().toISOString() };
  },
);

/** Live availability check for the SEO step. */
export const checkEstablishmentUrlKeyAction = adminAction(
  {
    schema: z.object({
      id: id.optional(),
      kind: z.enum(["slug", "shortSlug", "subdomain"]),
      value: z.string().trim().toLowerCase().max(100),
      citySlug: z.string().max(60).optional(),
    }),
  },
  async ({ id: establishmentId, kind, value, citySlug }) => {
    if (!value) return { available: false, message: "Required." };
    if (kind === "subdomain") {
      const err = (RESERVED_SUBDOMAINS as readonly string[]).includes(value) ? "That name is reserved." : subdomainError(value);
      if (err) return { available: false, message: err };
    } else if (!SLUG_RE.test(value)) {
      return { available: false, message: "Use lowercase letters, numbers and hyphens." };
    }
    if (kind === "shortSlug" && value.startsWith("dr-")) return { available: false, message: 'Links starting with "dr-" are for doctors.' };
    const available = await urlKeyAvailable(kind, value, { excludeId: establishmentId, citySlug });
    return { available, message: available ? "Available" : "Already taken" };
  },
);

export const publishEstablishmentAction = adminAction({ schema: z.object({ id }), roles: ["superadmin", "admin"] }, async ({ id: establishmentId }, admin) => {
  const doc = await load(establishmentId);
  await ensureUrlKeys(doc);
  const settings = await getSettings();
  const issues = scanEstablishment(doc, settings.bannedPhrases);
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
  await audit(auditCtx(admin), wasPublished ? `${doc.kind}.republish` : `${doc.kind}.publish`, {
    entity: "Establishment",
    entityId: doc._id,
    diff: { url: `/${doc.citySlug}/${doc.kind}/${doc.slug}` },
  });
  revalidatePublic({ kind: doc.kind, citySlug: doc.citySlug, slug: doc.slug });
  return { form: docToForm(doc.toObject()) };
});

const statusChange = (to: "draft" | "review" | "suspended", action: string, roles?: readonly ("superadmin" | "admin" | "sales")[]) =>
  adminAction({ schema: z.object({ id }), ...(roles ? { roles } : {}) }, async ({ id: establishmentId }, admin) => {
    const doc = await load(establishmentId);
    const from = doc.status;
    if (to === "review" && from === "published") throw new ActionError("This site is already published.");
    doc.status = to;
    await doc.save();
    await audit(auditCtx(admin), `${doc.kind}.${action}`, { entity: "Establishment", entityId: doc._id, diff: { status: { from, to } } });
    if (from === "published") revalidatePublic({ kind: doc.kind, citySlug: doc.citySlug, slug: doc.slug });
    return { form: docToForm(doc.toObject()) };
  });

export const unpublishEstablishmentAction = statusChange("draft", "unpublish", ["superadmin", "admin"]);
export const suspendEstablishmentAction = statusChange("suspended", "suspend", ["superadmin", "admin"]);
export const submitEstablishmentForReviewAction = statusChange("review", "submit_review");

/**
 * Email the owner a login link for self-editing (welcome wording). Uses the
 * saved owner email, so it must be saved on the Business step first.
 */
export const sendEstablishmentLoginEmailAction = adminAction({ schema: z.object({ id }) }, async ({ id: establishmentId }, admin) => {
  const doc = await Establishment.findById(establishmentId).select({ ownerEmail: 1 }).lean();
  if (!doc) throw new ActionError("Clinic or hospital not found.");
  if (!doc.ownerEmail) throw new ActionError("Save the owner's login email first.");
  const limit = await hitRateLimit(`login-link:admin:${establishmentId}`, 5, 60 * 60_000);
  if (!limit.allowed) throw new ActionError("Several login emails were sent in the last hour. Please wait before sending another.");
  const sent = await sendLoginLink(doc.ownerEmail, { welcome: true });
  if (!sent) throw new ActionError("The email couldn't be sent. Check the email settings (RESEND_API_KEY) and try again.");
  await audit(auditCtx(admin), "establishment.send_login_email", { entity: "Establishment", entityId: establishmentId, diff: { to: doc.ownerEmail } });
  return { to: doc.ownerEmail };
});

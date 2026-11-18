"use server";

import { after } from "next/server";
import { z } from "zod";
import { ActionError, fieldErrorsOf, type ActionResult } from "@/lib/admin/action";
import { audit, shallowDiff } from "@/lib/api/audit";
import { hitRateLimit } from "@/lib/api/rate-limit";
import { DoctorAuthError, doctorActor, ownerActor, requireAccount, requireDoctor } from "@/lib/auth/doctor";
import { scanFields } from "@/lib/compliance/scan";
import { accountSchema, accountTextFields, changeRequestSchema } from "@/lib/doctors/account";
import { publishProblems, scanDoctor } from "@/lib/doctors/server";
import { optionalEnv } from "@/lib/env";
import { createSignedUpload, type SignedUploadParams } from "@/lib/integrations/cloudinary";
import { sendEmail } from "@/lib/integrations/email";
import { revalidateDoctorPages, revalidateEstablishmentPages } from "@/lib/public/revalidate";
import { getSettings } from "@/lib/settings";
import { absUrl } from "@/lib/site";
import { createUpdateRequest } from "@/lib/update-requests/create";
import { ownerSiteSchema, ownerSiteTextFields } from "@/lib/establishments/owner";
import { publishProblems as siteProblems, scanEstablishment } from "@/lib/establishments/server";
import type { DoctorProfileDoc } from "@/models/DoctorProfile";
import type { EstablishmentDoc } from "@/models/Establishment";

/**
 * Self-edit actions for doctors and clinic/hospital owners. The account is re-read from the database on every
 * call; input is validated with the same schemas as the dashboard editor; free
 * text runs the NMC scan; every change is audit-logged and refreshes the live
 * page straight away.
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

const snapshot = (d: Pick<DoctorProfileDoc, "mobile" | "whatsapp" | "clinics" | "interestsPhoto" | "interestsStory">) => ({
  mobile: d.mobile ?? null,
  whatsapp: d.whatsapp ?? null,
  interestsPhoto: d.interestsPhoto ?? null,
  interestsStory: d.interestsStory ?? null,
  ...Object.fromEntries(
    d.clinics.map((c) => [
      `clinic:${String(c._id)}`,
      {
        addressLine1: c.addressLine1,
        addressLine2: c.addressLine2 ?? null,
        pincode: c.pincode,
        mapsUrl: c.mapsUrl ?? null,
        phone: c.phone ?? null,
        timings: c.timings,
        appointmentNote: c.appointmentNote ?? null,
        fee: c.fee ?? null,
        showFee: c.showFee,
      },
    ]),
  ),
});

export async function saveAccountAction(raw: unknown): Promise<ActionResult<{ savedAt: string }>> {
  return run(async () => {
    const me = await requireDoctor();
    const parsed = accountSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors = fieldErrorsOf(parsed.error);
      throw new ActionError(Object.values(fieldErrors)[0] ?? "Please check the form.", fieldErrors);
    }
    const input = parsed.data;
    const doc = me.doctor;

    // Doctors edit their existing clinics; they can't add, remove or swap them.
    const existing = doc.clinics.map((c) => String(c._id));
    const sent = input.clinics.map((c) => c.key);
    if (existing.length !== sent.length || existing.some((id) => !sent.includes(id))) {
      throw new ActionError("Your clinics have changed since you opened this page. Please reload and try again.");
    }

    const settings = await getSettings();
    const textIssues = scanFields(accountTextFields(input), settings.bannedPhrases);
    if (textIssues.length > 0) {
      const fieldErrors = Object.fromEntries(textIssues.map((i) => [i.field, `Not allowed under NMC guidelines: "${i.phrase}"`]));
      throw new ActionError("Some wording isn't allowed on doctor pages. Please change the highlighted text.", fieldErrors);
    }

    const before = snapshot(doc.toObject());
    doc.mobile = input.mobile;
    doc.whatsapp = input.whatsapp;
    if (input.interestsStory) doc.set({ interestsStory: input.interestsStory.title ? input.interestsStory : undefined });
    if (input.interestsPhoto !== undefined) doc.set({ interestsPhoto: input.interestsPhoto ?? undefined });
    for (const c of input.clinics) {
      const clinic = doc.clinics.find((x) => String(x._id) === c.key)!;
      // Subdocument setters track each change for save().
      Object.assign(clinic, {
        addressLine1: c.addressLine1,
        addressLine2: c.addressLine2,
        pincode: c.pincode,
        mapsUrl: c.mapsUrl,
        phone: c.phone,
        timings: c.timings.filter((t) => t.slots.length > 0),
        appointmentNote: c.appointmentNote,
        fee: c.fee,
        showFee: c.showFee,
      });
    }

    const issues = scanDoctor(doc, settings.bannedPhrases);
    if (doc.status === "published" && publishProblems(doc, issues).length > 0) {
      throw new ActionError("This change can't go live as it is. Please use “Request a change” and our team will help.");
    }
    doc.compliance.issues = issues;
    doc.compliance.lastScanAt = new Date();
    await doc.save();

    const diff = shallowDiff(before, snapshot(doc.toObject()));
    if (Object.keys(diff).length > 0) {
      await audit(doctorActor(me), "doctor.self_edit", { entity: "DoctorProfile", entityId: doc._id, diff });
    }
    if (doc.status === "published") revalidateDoctorPages({ citySlug: doc.citySlug, slug: doc.slug });
    return { savedAt: new Date().toISOString() };
  });
}

// Doctors may only upload the "Beyond medicine" photo from their account.
const doctorUploadSchema = z.object({ purpose: z.literal("interests") });

/** Signed Cloudinary upload params for the signed-in doctor. */
export async function signDoctorUploadAction(raw: unknown): Promise<ActionResult<SignedUploadParams>> {
  return run(async () => {
    const me = await requireDoctor();
    const parsed = doctorUploadSchema.safeParse(raw);
    if (!parsed.success) throw new ActionError("This upload isn't allowed.");
    const limit = await hitRateLimit(`doctor-upload:${me.id}`, 20, 60 * 60_000);
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
// Clinic / hospital owners
// ---------------------------------------------------------------------------

const siteSnapshot = (s: EstablishmentDoc) => ({
  address: { line1: s.address?.line1 ?? null, line2: s.address?.line2 ?? null, pincode: s.address?.pincode ?? null, landmark: s.address?.landmark ?? null, parkingNote: s.address?.parkingNote ?? null },
  mapsUrl: s.mapsUrl ?? null,
  phones: s.contact?.phones ?? [],
  whatsapp: s.contact?.whatsapp ?? null,
  emergencyPhone: s.contact?.emergencyPhone ?? null,
  is24x7: s.is24x7,
  timings: s.timings,
  appointmentNote: s.appointmentNote ?? null,
  visitingHours: s.visitingHours ?? null,
});

/** Save what a clinic/hospital owner may change (lib/establishments/owner.ts). */
export async function saveSiteAccountAction(raw: unknown): Promise<ActionResult<{ savedAt: string }>> {
  return run(async () => {
    const me = await requireAccount();
    const parsed = ownerSiteSchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors = fieldErrorsOf(parsed.error);
      throw new ActionError(Object.values(fieldErrors)[0] ?? "Please check the form.", fieldErrors);
    }
    const input = parsed.data;
    // Only sites owned by this login email; re-read on every call.
    const doc = me.sites.find((s) => String(s._id) === input.id);
    if (!doc) throw new ActionError("You can't edit that site. Please reload the page.");

    const settings = await getSettings();
    const textIssues = scanFields(ownerSiteTextFields(input), settings.bannedPhrases);
    if (textIssues.length > 0) {
      const fieldErrors = Object.fromEntries(textIssues.map((i) => [i.field, `Not allowed under NMC guidelines: "${i.phrase}"`]));
      throw new ActionError("Some wording isn't allowed on clinic and hospital sites. Please change the highlighted text.", fieldErrors);
    }

    const before = siteSnapshot(doc.toObject());
    // Problems the site already had (e.g. a missing approval record) are the team's to fix;
    // only a change that adds a new one is refused.
    const problemsBefore = doc.status === "published" ? siteProblems(doc, scanEstablishment(doc, settings.bannedPhrases)) : [];
    doc.set({
      "address.line1": input.address.line1,
      "address.line2": input.address.line2,
      "address.pincode": input.address.pincode,
      "address.landmark": input.address.landmark,
      "address.parkingNote": input.address.parkingNote,
      mapsUrl: input.mapsUrl,
      "contact.phones": input.phones.filter((p): p is string => Boolean(p)),
      "contact.whatsapp": input.whatsapp,
      "contact.emergencyPhone": input.emergencyPhone,
      is24x7: input.is24x7,
      timings: input.timings.filter((t) => t.slots.length > 0),
      appointmentNote: input.appointmentNote,
      // Visiting hours are a hospital field; clinics never set them here.
      ...(doc.kind === "hospital" ? { visitingHours: input.visitingHours } : {}),
    });

    const issues = scanEstablishment(doc, settings.bannedPhrases);
    if (doc.status === "published" && siteProblems(doc, issues).some((p) => !problemsBefore.includes(p))) {
      throw new ActionError("This change can't go live as it is. Please message us and our team will help.");
    }
    doc.compliance.issues = issues;
    doc.compliance.lastScanAt = new Date();
    await doc.save();

    const diff = shallowDiff(before, siteSnapshot(doc.toObject()));
    if (Object.keys(diff).length > 0) {
      await audit(ownerActor(me, String(doc._id)), `${doc.kind}.self_edit`, { entity: "Establishment", entityId: doc._id, diff });
    }
    if (doc.status === "published") revalidateEstablishmentPages({ kind: doc.kind, citySlug: doc.citySlug, slug: doc.slug });
    return { savedAt: new Date().toISOString() };
  });
}

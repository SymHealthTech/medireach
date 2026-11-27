"use server";

import { z } from "zod";
import { ActionError, adminAction, auditCtx, objectId } from "@/lib/admin/action";
import { audit } from "@/lib/api/audit";
import { INTAKE_STATUSES } from "@/lib/constants";
import { ConvertError, createSiteFromIntake } from "@/lib/intake/convert";
import { saveIntake, type IntakeView } from "@/lib/intake/server";
import { intakeSites } from "@/lib/intake/site-status";
import { Intake } from "@/models/Intake";

const roles = ["superadmin", "admin", "sales"] as const;

/** Admin edits to a form (fill gaps, add photos). Never changes its status. */
export const saveIntakeAdminAction = adminAction(
  { schema: z.object({ id: objectId, email: z.string().max(300), data: z.unknown(), photos: z.unknown() }), roles },
  async ({ id, email, data, photos }, admin): Promise<IntakeView> => {
    const doc = await Intake.findById(id).select({ kind: 1 }).lean();
    if (!doc) throw new ActionError("Form not found.");
    const out = await saveIntake({ id, kind: doc.kind, email, data, photos, submit: false }, null, { asAdmin: true });
    if (!out.ok) throw new ActionError(out.error, "fieldErrors" in out ? out.fieldErrors : undefined);
    await audit(auditCtx(admin), "intake.update", { entity: "Intake", entityId: id });
    return out.intake;
  },
);

export const setIntakeStatusAction = adminAction(
  { schema: z.object({ id: objectId, status: z.enum(INTAKE_STATUSES) }), roles },
  async ({ id, status }, admin) => {
    const before = await Intake.findByIdAndUpdate(id, { $set: { status } }).select({ status: 1 }).lean();
    if (!before) throw new ActionError("Form not found.");
    await audit(auditCtx(admin), "intake.status", { entity: "Intake", entityId: id, diff: { status: { from: before.status, to: status } } });
    return { id };
  },
);

export const saveIntakeNotesAction = adminAction(
  { schema: z.object({ id: objectId, notes: z.string().trim().max(5000) }), roles },
  async ({ id, notes }, admin) => {
    const res = await Intake.updateOne({ _id: id }, notes ? { $set: { adminNotes: notes } } : { $unset: { adminNotes: 1 } });
    if (res.matchedCount === 0) throw new ActionError("Form not found.");
    await audit(auditCtx(admin), "intake.notes", { entity: "Intake", entityId: id });
    return { id };
  },
);

/**
 * Make a draft doctor page / clinic / hospital site from the form and open it
 * in the editor. The form is marked "in review" and linked to the draft.
 */
export const createSiteFromIntakeAction = adminAction({ schema: z.object({ id: objectId }), roles }, async ({ id }, admin) => {
  const intake = await Intake.findById(id).lean();
  if (!intake) throw new ActionError("Form not found.");
  // Already made (and not deleted since): open it.
  const existing = (await intakeSites([intake])).get(String(intake._id));
  if (existing) return { href: existing.href };
  let made;
  try {
    made = await createSiteFromIntake(intake);
  } catch (err) {
    if (err instanceof ConvertError) throw new ActionError(err.message);
    throw err;
  }
  await Intake.updateOne(
    { _id: id },
    { $set: { convertedTo: { kind: made.kind, id: made.id }, ...(intake.status === "draft" || intake.status === "submitted" ? { status: "in_review" } : {}) } },
  );
  await audit(auditCtx(admin), "intake.convert", { entity: "Intake", entityId: id, diff: { to: `${made.kind}:${made.id}` } });
  return { href: made.href };
});

/** Delete a form (spam or duplicates). Admins only. Photos stay in Cloudinary. */
export const deleteIntakeAction = adminAction({ schema: z.object({ id: objectId }), roles: ["superadmin", "admin"] }, async ({ id }, admin) => {
  const doc = await Intake.findByIdAndDelete(id).select({ ref: 1, email: 1 }).lean();
  if (!doc) throw new ActionError("Form not found.");
  await audit(auditCtx(admin), "intake.delete", { entity: "Intake", entityId: id, diff: { ref: doc.ref, email: doc.email } });
  return { id };
});

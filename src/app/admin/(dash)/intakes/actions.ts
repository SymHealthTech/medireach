"use server";

import { z } from "zod";
import { ActionError, adminAction, auditCtx, objectId } from "@/lib/admin/action";
import { audit } from "@/lib/api/audit";
import { INTAKE_STATUSES } from "@/lib/constants";
import { ConvertError, createSiteFromIntake } from "@/lib/intake/convert";
import { saveIntake, type IntakeView } from "@/lib/intake/server";
import { intakeSites } from "@/lib/intake/site-status";
import { Intake } from "@/models/Intake";
import { intakeScope } from "@/lib/admin/scope";
import { assignIntakeToSales, giveSiteToSales } from "@/lib/visits/match";
import { Admin } from "@/models/Admin";
import type { CurrentAdmin } from "@/lib/auth/admin";

const roles = ["superadmin", "sales"] as const;

/** Sales executives may work only on forms made into their own websites. */
async function inScope(admin: CurrentAdmin, id: string) {
  return { _id: id, ...(await intakeScope(admin)) };
}

/** Admin edits to a form (fill gaps, add photos). Never changes its status. */
export const saveIntakeAdminAction = adminAction(
  { schema: z.object({ id: objectId, email: z.string().max(300), data: z.unknown(), photos: z.unknown() }), roles },
  async ({ id, email, data, photos }, admin): Promise<IntakeView> => {
    const doc = await Intake.findOne(await inScope(admin, id)).select({ kind: 1 }).lean();
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
    const before = await Intake.findOneAndUpdate(await inScope(admin, id), { $set: { status } }).select({ status: 1 }).lean();
    if (!before) throw new ActionError("Form not found.");
    await audit(auditCtx(admin), "intake.status", { entity: "Intake", entityId: id, diff: { status: { from: before.status, to: status } } });
    return { id };
  },
);

export const saveIntakeNotesAction = adminAction(
  { schema: z.object({ id: objectId, notes: z.string().trim().max(5000) }), roles },
  async ({ id, notes }, admin) => {
    const res = await Intake.updateOne(await inScope(admin, id), notes ? { $set: { adminNotes: notes } } : { $unset: { adminNotes: 1 } });
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
  const intake = await Intake.findOne(await inScope(admin, id)).lean();
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
  // The form's sales executive owns the new draft.
  if (intake.salesAdminId) await giveSiteToSales(made.kind, made.id, intake.salesAdminId, { onlyIfUnowned: false });
  await audit(auditCtx(admin), "intake.convert", { entity: "Intake", entityId: id, diff: { to: `${made.kind}:${made.id}` } });
  return { href: made.href };
});

/** Delete a form (spam or duplicates). Admins only. Photos stay in Cloudinary. */
export const deleteIntakeAction = adminAction({ schema: z.object({ id: objectId }), roles: ["superadmin"] }, async ({ id }, admin) => {
  const doc = await Intake.findByIdAndDelete(id).select({ ref: 1, email: 1 }).lean();
  if (!doc) throw new ActionError("Form not found.");
  await audit(auditCtx(admin), "intake.delete", { entity: "Intake", entityId: id, diff: { ref: doc.ref, email: doc.email } });
  return { id };
});

/**
 * Super admin: give this form to a sales executive (or to nobody). Their
 * matching visit, if any, shows "Form filled"; the website draft made from the
 * form becomes theirs. Automatic matching never overrides this.
 */
export const assignIntakeSalesAction = adminAction(
  { schema: z.object({ id: objectId, salesAdminId: objectId.nullable() }), roles: ["superadmin"] },
  async ({ id, salesAdminId }, admin) => {
    const exec = salesAdminId ? await Admin.findOne({ _id: salesAdminId, role: "sales" }).select({ name: 1, staffId: 1 }).lean() : null;
    if (salesAdminId && !exec) throw new ActionError("That sales executive was not found.");
    let res;
    try {
      res = await assignIntakeToSales(id, salesAdminId);
    } catch {
      throw new ActionError("Form not found.");
    }
    await audit(auditCtx(admin), "intake.assign_sales", { entity: "Intake", entityId: id, diff: { to: exec ? `${exec.name} (${exec.staffId ?? "no ID"})` : "nobody" } });
    return { name: exec?.name ?? null, visitDay: res.visitDay ?? null };
  },
);

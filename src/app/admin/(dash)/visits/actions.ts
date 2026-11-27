"use server";

import { z } from "zod";
import { ActionError, adminAction, auditCtx, indianMobile, objectId, optionalText } from "@/lib/admin/action";
import { audit } from "@/lib/api/audit";
import type { CurrentAdmin } from "@/lib/auth/admin";
import { INTAKE_KINDS, VISIT_OUTCOMES } from "@/lib/constants";
import { daysBefore, isDay, todayIST } from "@/lib/visits/days";
import { visitKeys } from "@/lib/visits/keys";
import { linkIntakeToSales, linkVisitToIntakes } from "@/lib/visits/match";
import { Visit } from "@/models/Visit";

/**
 * Field visits: a sales executive's daily work list. They log whom they met
 * (doctor's name, clinic / hospital name, mobile: the three confirming fields)
 * and the reply. The super admin sees everyone's. Each save re-matches website
 * forms (lib/visits/match.ts), so a form sent before or after the visit joins
 * this executive.
 */

const BACKDATE_DAYS = 31;

const fields = z
  .object({
    day: z.string().refine(isDay, "Pick the visit date."),
    kind: z.enum(INTAKE_KINDS),
    doctorName: optionalText(100),
    clinicName: optionalText(120),
    mobile: indianMobile,
    area: optionalText(80),
    outcome: z.enum(VISIT_OUTCOMES),
    followUpOn: z
      .string()
      .refine((s) => s === "" || isDay(s), "Pick a date.")
      .transform((s) => s || undefined),
    notes: optionalText(1000),
  })
  .refine((v) => v.doctorName || v.clinicName, { message: "Enter the doctor's name or the clinic / hospital name.", path: ["doctorName"] })
  .refine((v) => v.day <= todayIST() && v.day >= daysBefore(todayIST(), BACKDATE_DAYS), { message: `Pick a date in the last ${BACKDATE_DAYS} days.`, path: ["day"] })
  .refine((v) => !v.followUpOn || v.followUpOn >= v.day, { message: "The follow-up comes after the visit.", path: ["followUpOn"] });

/** A sales executive works on their own visits; the super admin can correct anyone's. */
async function loadOwn(id: string, admin: CurrentAdmin) {
  const v = await Visit.findById(id);
  if (!v || (admin.role === "sales" && String(v.salesAdminId) !== admin.id)) throw new ActionError("Visit not found.");
  return v;
}

export const createVisitAction = adminAction({ schema: fields, roles: ["sales"] }, async (input, admin) => {
  const visit = await Visit.create({ ...input, salesAdminId: admin.id, salesName: admin.name, staffId: admin.staffId, matchKeys: visitKeys(input) });
  await linkVisitToIntakes(visit._id);
  await audit(auditCtx(admin), "visit.create", { entity: "Visit", entityId: visit._id, diff: { name: input.doctorName ?? input.clinicName, outcome: input.outcome } });
  const linked = await Visit.findById(visit._id).select({ intakeId: 1 }).lean();
  return { id: String(visit._id), formFilled: Boolean(linked?.intakeId) };
});

export const updateVisitAction = adminAction({ schema: z.object({ id: objectId, data: fields }) }, async ({ id, data }, admin) => {
  const visit = await loadOwn(id, admin);
  const before = visit.intakeId;
  visit.set({ ...data, matchKeys: visitKeys(data) });
  for (const k of ["doctorName", "clinicName", "mobile", "area", "followUpOn", "notes"] as const) if (data[k] === undefined) visit.set(k, undefined);
  await visit.save();
  await linkVisitToIntakes(visit._id);
  if (before) await linkIntakeToSales(before);
  await audit(auditCtx(admin), "visit.update", { entity: "Visit", entityId: id, diff: { outcome: data.outcome } });
  return { id };
});

export const deleteVisitAction = adminAction({ schema: z.object({ id: objectId }) }, async ({ id }, admin) => {
  const visit = await loadOwn(id, admin);
  await visit.deleteOne();
  // A form matched through this visit is matched again without it.
  if (visit.intakeId) await linkIntakeToSales(visit.intakeId);
  await audit(auditCtx(admin), "visit.delete", { entity: "Visit", entityId: id, diff: { name: visit.doctorName ?? visit.clinicName } });
  return { id };
});

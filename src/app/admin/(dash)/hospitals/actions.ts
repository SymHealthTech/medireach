"use server";

import { z } from "zod";
import { ActionError, adminAction, auditCtx, objectId, optionalEmail, optionalText, requiredText } from "@/lib/admin/action";
import { audit, shallowDiff } from "@/lib/api/audit";
import { Area } from "@/models/Area";
import { DoctorProfile } from "@/models/DoctorProfile";
import { Hospital } from "@/models/Hospital";

const fields = z.object({
  name: requiredText(150, "Hospital name"),
  cityId: objectId,
  areaId: z
    .string()
    .refine((s) => s === "" || /^[a-f0-9]{24}$/i.test(s))
    .transform((s) => s || undefined),
  address: optionalText(300),
  contactPerson: optionalText(100),
  phone: optionalText(20),
  email: optionalEmail,
  pricePerDoctor: z.number().int().min(0).max(1_000_000).optional(),
  notes: optionalText(2000),
});

async function checkArea(cityId: string, areaId?: string) {
  if (!areaId) return;
  const area = await Area.findById(areaId).select({ cityId: 1 }).lean();
  if (!area || String(area.cityId) !== cityId) throw new ActionError("Choose an area in this city.", { areaId: "Choose an area in this city." });
}

export const createHospitalAction = adminAction({ schema: fields }, async (input, admin) => {
  await checkArea(input.cityId, input.areaId);
  const h = await Hospital.create(input);
  await audit(auditCtx(admin), "hospital.create", { entity: "Hospital", entityId: h._id, diff: { name: input.name } });
  return { id: String(h._id) };
});

export const updateHospitalAction = adminAction({ schema: fields.extend({ id: objectId }) }, async ({ id, ...input }, admin) => {
  await checkArea(input.cityId, input.areaId);
  const before = await Hospital.findById(id).lean();
  if (!before) throw new ActionError("Hospital not found.");
  await Hospital.updateOne({ _id: id }, { $set: input, ...(input.areaId ? {} : { $unset: { areaId: 1 } }) });
  await audit(auditCtx(admin), "hospital.update", {
    entity: "Hospital",
    entityId: id,
    diff: shallowDiff({ ...before, cityId: String(before.cityId), areaId: before.areaId ? String(before.areaId) : undefined } as Record<string, unknown>, input),
  });
  return { id };
});

export const deleteHospitalAction = adminAction(
  { schema: z.object({ id: objectId }), roles: ["superadmin", "admin"] },
  async ({ id }, admin) => {
    const linked = await DoctorProfile.countDocuments({ $or: [{ hospitalAccountId: id }, { "clinics.hospitalId": id }] });
    if (linked > 0) throw new ActionError(`This hospital is linked to ${linked} doctor${linked === 1 ? "" : "s"}. Unlink them first.`);
    await Hospital.deleteOne({ _id: id });
    await audit(auditCtx(admin), "hospital.delete", { entity: "Hospital", entityId: id });
    return { id };
  },
);

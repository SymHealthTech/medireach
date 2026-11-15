"use server";

import { z } from "zod";
import { ActionError, adminAction, auditCtx, objectId, requiredText } from "@/lib/admin/action";
import { audit } from "@/lib/api/audit";
import { UPDATE_REQUEST_STATUSES } from "@/lib/constants";
import { getSettings } from "@/lib/settings";
import { DoctorProfile } from "@/models/DoctorProfile";
import { UpdateRequest } from "@/models/UpdateRequest";

const ADMINS = ["superadmin", "admin"] as const;

/**
 * New update request. The doctor's first one is free (price 0, marked paid)
 * when `freeUpdateUsed` is false; the doctor is then marked as having used it.
 */
export const createUpdateRequestAction = adminAction(
  { schema: z.object({ doctorId: objectId, description: requiredText(2000, "Description") }), roles: ADMINS },
  async ({ doctorId, description }, admin) => {
    // Claim the free update atomically, so two quick requests can't both be free.
    const claimed = await DoctorProfile.findOneAndUpdate(
      { _id: doctorId, freeUpdateUsed: { $ne: true } },
      { $set: { freeUpdateUsed: true } },
      { projection: { _id: 1 } },
    ).lean();
    if (!claimed && !(await DoctorProfile.exists({ _id: doctorId }))) throw new ActionError("Doctor not found.");
    const free = Boolean(claimed);
    const settings = await getSettings();
    const req = await UpdateRequest.create({
      doctorId,
      description,
      status: "new",
      price: free ? 0 : settings.prices.update,
      paid: free,
    });
    await audit(auditCtx(admin), "update_request.create", { entity: "UpdateRequest", entityId: req._id, diff: { doctorId, free } });
    return { id: String(req._id), free };
  },
);

export const moveUpdateRequestAction = adminAction(
  { schema: z.object({ id: objectId, status: z.enum(UPDATE_REQUEST_STATUSES) }), roles: ADMINS },
  async ({ id, status }, admin) => {
    const req = await UpdateRequest.findById(id);
    if (!req) throw new ActionError("Request not found.");
    const from = req.status;
    req.status = status;
    req.completedAt = status === "done" ? new Date() : undefined;
    await req.save();
    await audit(auditCtx(admin), "update_request.status", { entity: "UpdateRequest", entityId: id, diff: { status: { from, to: status } } });
    return { id };
  },
);

export const setUpdateRequestPaidAction = adminAction(
  { schema: z.object({ id: objectId, paid: z.boolean() }), roles: ADMINS },
  async ({ id, paid }, admin) => {
    const res = await UpdateRequest.updateOne({ _id: id }, { $set: { paid } });
    if (res.matchedCount === 0) throw new ActionError("Request not found.");
    await audit(auditCtx(admin), "update_request.paid", { entity: "UpdateRequest", entityId: id, diff: { paid } });
    return { id };
  },
);

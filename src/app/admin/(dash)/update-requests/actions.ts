"use server";

import { z } from "zod";
import { ActionError, adminAction, auditCtx, objectId, requiredText } from "@/lib/admin/action";
import { audit } from "@/lib/api/audit";
import { UPDATE_REQUEST_STATUSES } from "@/lib/constants";
import { createUpdateRequest } from "@/lib/update-requests/create";
import { UpdateRequest } from "@/models/UpdateRequest";

const ADMINS = ["superadmin"] as const;

/** New update request; the doctor's first one is free (see createUpdateRequest). */
export const createUpdateRequestAction = adminAction(
  { schema: z.object({ doctorId: objectId, description: requiredText(2000, "Description") }), roles: ADMINS },
  async ({ doctorId, description }, admin) => {
    const req = await createUpdateRequest(doctorId, description);
    if (!req) throw new ActionError("Doctor not found.");
    await audit(auditCtx(admin), "update_request.create", { entity: "UpdateRequest", entityId: req.id, diff: { doctorId, free: req.free } });
    return { id: req.id, free: req.free };
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

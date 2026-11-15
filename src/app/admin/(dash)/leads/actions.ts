"use server";

import { z } from "zod";
import { ActionError, adminAction, auditCtx, indianMobile, objectId, optionalText, requiredText } from "@/lib/admin/action";
import { audit } from "@/lib/api/audit";
import { LEAD_SOURCES, LEAD_STATUSES } from "@/lib/constants";
import { Lead } from "@/models/Lead";

const leadFields = z.object({
  name: requiredText(100, "Name"),
  phone: indianMobile.refine((v) => Boolean(v), "Phone is required."),
  city: optionalText(60),
  specialty: optionalText(80),
  message: optionalText(1000),
  source: z.enum(LEAD_SOURCES),
});

export const createLeadAction = adminAction({ schema: leadFields }, async (input, admin) => {
  const lead = await Lead.create({ ...input, status: "new" });
  await audit(auditCtx(admin), "lead.create", { entity: "Lead", entityId: lead._id, diff: { name: input.name } });
  return { id: String(lead._id) };
});

export const updateLeadAction = adminAction({ schema: leadFields.extend({ id: objectId }) }, async ({ id, ...input }, admin) => {
  const res = await Lead.updateOne({ _id: id }, { $set: input });
  if (res.matchedCount === 0) throw new ActionError("Lead not found.");
  await audit(auditCtx(admin), "lead.update", { entity: "Lead", entityId: id, diff: input });
  return { id };
});

export const setLeadStatusAction = adminAction(
  { schema: z.object({ id: objectId, status: z.enum(LEAD_STATUSES) }) },
  async ({ id, status }, admin) => {
    const before = await Lead.findByIdAndUpdate(id, { $set: { status } }).select({ status: 1 }).lean();
    if (!before) throw new ActionError("Lead not found.");
    await audit(auditCtx(admin), "lead.status", { entity: "Lead", entityId: id, diff: { status: { from: before.status, to: status } } });
    return { id };
  },
);

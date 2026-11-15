"use server";

import { z } from "zod";
import { ActionError, adminAction, auditCtx, requiredText } from "@/lib/admin/action";
import { audit } from "@/lib/api/audit";
import { TEMPLATE_KEYS, TEMPLATE_STATUSES, TEMPLATE_TYPES } from "@/lib/constants";
import { TemplateSlot } from "@/models/TemplateSlot";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/public/tags";

const ADMINS = ["superadmin", "admin"] as const;
const slotKey = z.object({ type: z.enum(TEMPLATE_TYPES), key: z.enum(TEMPLATE_KEYS) });

// Module-level so its callback isn't mistaken for a server action.
const cloudinaryUrl = z.string().url().refine((u) => u.startsWith("https://res.cloudinary.com/"), "Upload the image first.");

export const updateTemplateSlotAction = adminAction(
  {
    schema: slotKey.extend({
      name: requiredText(60, "Name"),
      status: z.enum(TEMPLATE_STATUSES),
      previewImage: z
        .object({ publicId: z.string().min(1).max(300), url: cloudinaryUrl })
        .nullable(),
    }),
    roles: ADMINS,
  },
  async ({ type, key, name, status, previewImage }, admin) => {
    const slot = await TemplateSlot.findOne({ type, key });
    if (!slot) throw new ActionError("Template slot not found.");
    if (slot.isDefault && status !== "ready") throw new ActionError("The default design must stay ready. Set another default first.");
    const before = { name: slot.name, status: slot.status };
    slot.name = name;
    slot.status = status;
    slot.previewImage = previewImage ?? undefined;
    await slot.save();
    // Pages using this slot switch between it and Classic.
    revalidateTag(CACHE_TAGS.templates);
    await audit(auditCtx(admin), "template.update", { entity: "TemplateSlot", entityId: slot._id, diff: { before, after: { name, status } } });
    return { ok: true };
  },
);

export const setDefaultTemplateAction = adminAction({ schema: slotKey, roles: ADMINS }, async ({ type, key }, admin) => {
  const slot = await TemplateSlot.findOne({ type, key });
  if (!slot) throw new ActionError("Template slot not found.");
  if (slot.status !== "ready") throw new ActionError("Only a ready design can be the default.");
  await TemplateSlot.updateMany({ type, isDefault: true }, { $set: { isDefault: false } });
  slot.isDefault = true;
  await slot.save();
  await audit(auditCtx(admin), "template.default", { entity: "TemplateSlot", entityId: slot._id, diff: { type, key } });
  return { ok: true };
});
